import { NextRequest, NextResponse } from 'next/server';
import spotifyClient from '@/lib/spotify/client';

const inFlightRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, { data: any; expiresAt: number }>();

let spotifyRateLimitResetAt = 0;
let serverBackoffMultiplier = 1;
const MAX_SERVER_BACKOFF_MS = 60000; // 60 second max server-side backoff

const CACHE_TTL_MS = {
  '/me/player': 500, // Cache playback state for 500ms to deduplicate across tabs
  '/me/player/devices': 2000, // Devices rarely change, cache longer
  '/me': 3000, // User profile changes rarely
  default: 1000, // Default 1s cache
};

function getCacheTTL(path: string): number {
  for (const [pattern, ttl] of Object.entries(CACHE_TTL_MS)) {
    if (pattern !== 'default' && path.startsWith(pattern)) return ttl;
  }
  return CACHE_TTL_MS.default;
}

function getCacheKey(method: string, path: string): string {
  // Only cache GET requests; others are state-changing
  return method === 'GET' ? `${method}:${path}` : '';
}

/**
 * Check if we should wait before making the next request due to rate limiting.
 */
async function waitIfServerRateLimited() {
  const now = Date.now();
  if (spotifyRateLimitResetAt > now) {
    const delay = spotifyRateLimitResetAt - now;
    console.warn(
      `[Spotify Proxy] Server-side rate limited. Waiting ${delay}ms until ${new Date(spotifyRateLimitResetAt).toISOString()}`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Handle 429 rate limit response from Spotify.
 */
function handleSpotify429(retryAfterSeconds?: number) {
  const now = Date.now();
  const delayMs = Math.min(
    (retryAfterSeconds || serverBackoffMultiplier * 5) * 1000,
    MAX_SERVER_BACKOFF_MS
  );

  spotifyRateLimitResetAt = now + delayMs;
  serverBackoffMultiplier = Math.min(serverBackoffMultiplier * 2, 12); // Cap at 12x

  console.error(
    `[Spotify Proxy] Hit 429 from Spotify. Backoff for ${delayMs}ms. ` +
      `Multiplier: ${serverBackoffMultiplier}x. Next retry after: ${new Date(spotifyRateLimitResetAt).toISOString()}`
  );
}

function getApiPath(request: NextRequest) {
  const { pathname, search } = new URL(request.url);
  return pathname.replace('/api/spotify', '') + search;
}

export async function GET(request: NextRequest) {
  console.log('=== SPOTIFY API ROUTE HANDLER CALLED ===');
  console.log('Request URL:', request.url);
  console.log('Has cookies:', request.cookies.getAll().length > 0);
  
  const apiPath = getApiPath(request);
  console.log('API Path:', apiPath);
  const cacheKey = getCacheKey('GET', apiPath);

  // Check response cache first
  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }
    responseCache.delete(cacheKey);
  }

  // Check if request is already in-flight
  if (cacheKey && inFlightRequests.has(cacheKey)) {
    try {
      const cachedResponse = await inFlightRequests.get(cacheKey);
      return NextResponse.json(cachedResponse);
    } catch (err: any) {
      // If in-flight request failed, continue to make new request
      inFlightRequests.delete(cacheKey);
    }
  }

  // Create promise for this request
  const requestPromise = (async () => {
    // Wait if server is rate-limited by Spotify
    await waitIfServerRateLimited();

    try {
      console.log('[Spotify API Route] Creating client for path:', apiPath);
      const client = spotifyClient();
      console.log('[Spotify API Route] Making request to:', apiPath);
      const res = await client.get(apiPath);
      console.log('[Spotify API Route] Request successful:', apiPath);
      
      // Reset backoff on success
      serverBackoffMultiplier = 1;
      spotifyRateLimitResetAt = 0;
      
      if (res.status === 204) {
        return null;
      }
      // Cache successful response
      if (cacheKey) {
        responseCache.set(cacheKey, {
          data: res.data,
          expiresAt: Date.now() + getCacheTTL(apiPath),
        });
      }
      return res.data;
    } catch (err: any) {
      console.error('[Spotify API Route] Error occurred:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        stack: err.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      // Check for 429 rate limit error
      const status = err.response?.status;
      const retryAfter = err.response?.headers?.['retry-after'];
      
      if (status === 429) {
        handleSpotify429(retryAfter ? parseInt(retryAfter) : undefined);
        
        // Return 429 to client with retry-after header
        const retryAfterMs = spotifyRateLimitResetAt - Date.now();
        const error = new Error('Rate limited by Spotify');
        (error as any).status = 429;
        (error as any).retryAfterMs = retryAfterMs;
        throw error;
      }
      
      // Extract status from axios error response
      const errorData = err.response?.data;
      
      // Re-throw with normalized error object that includes status
      const error = new Error(errorData?.error?.message || err.message);
      (error as any).status = status;
      (error as any).originalError = err;
      throw error;
    }
  })();

  // Track in-flight request
  if (cacheKey) {
    inFlightRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  try {
    const data = await requestPromise;
    if (data === null) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    const status = err.status || err.response?.status || 500;
    const headers: Record<string, string> = {};
    
    // Add retry-after header for 429 responses
    if (status === 429 && err.retryAfterMs) {
      headers['retry-after'] = Math.ceil(err.retryAfterMs / 1000).toString();
      headers['x-rate-limit-reset'] = new Date(Date.now() + err.retryAfterMs).toISOString();
    }
    
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status, headers }
    );
  }
}

export async function PUT(request: NextRequest) {
  const apiPath = getApiPath(request);
  const body = await request.json().catch(() => undefined);
  try {
    const client = spotifyClient();
    const res = await client.put(apiPath, body);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiPath = getApiPath(request);
  const body = await request.json();
  try {
    const client = spotifyClient();
    const res = await client.post(apiPath, body);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const apiPath = getApiPath(request);
  try {
    const client = spotifyClient();
    const res = await client.delete(apiPath);
    if (res.status === 204) {
      return NextResponse.json({}, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}