const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export type TokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

// Retry policy defaults (Option A)
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500; // 500ms
const MAX_DELAY_MS = 8000; // cap delay to 8s
const JITTER_FACTOR = 0.5; // ±50%

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  // If it's a number (seconds)
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return Number.isFinite(seconds) ? seconds : null;
  }
  // Otherwise try HTTP-date
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const diff = Math.ceil((date.getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }
  return null;
}

async function postTokenForm(params: URLSearchParams): Promise<TokenResponse> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify client credentials');
  }

  const authHeader = `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`;

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader,
        },
        body: params.toString(),
      });

      const text = await resp.text().catch(() => '');
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = {};
      }

      if (resp.ok) {
        return data as TokenResponse;
      }

      // If response indicates transient condition, maybe retry
      const status = resp.status;
      const retryAfterHeader = resp.headers?.get?.('retry-after') ?? null;

      const retriable = status === 429 || (status >= 500 && status < 600);

      // If not retriable, throw immediately with body snippet
      if (!retriable) {
        const snippet = (typeof text === 'string' ? text : JSON.stringify(data || {})).slice(0, 200);
        throw new Error(data.error_description || data.error || `Token request failed: ${status} ${snippet}`);
      }

      // Decide delay: honor Retry-After when present (cap it), otherwise exponential backoff
      let delayMs: number;
      const retryAfterSeconds = parseRetryAfter(retryAfterHeader);
      if (retryAfterSeconds !== null) {
        delayMs = Math.min(retryAfterSeconds * 1000, MAX_DELAY_MS);
      } else {
        delayMs = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
      }

      // Apply jitter ±JITTER_FACTOR
      const jitterMultiplier = 1 + ((Math.random() * 2 - 1) * JITTER_FACTOR);
      const finalDelay = Math.max(0, Math.round(delayMs * jitterMultiplier));

      console.warn(`Spotify token request attempt ${attempt} failed (status ${status}). Retrying in ${finalDelay}ms. Retry-After: ${retryAfterHeader ?? 'none'}`);

      // If this was the last attempt, break and throw below
      if (attempt === MAX_ATTEMPTS) {
        const snippet = (typeof text === 'string' ? text : JSON.stringify(data || {})).slice(0, 200);
        lastError = new Error(data.error_description || data.error || `Token request failed after ${MAX_ATTEMPTS} attempts: ${status} ${snippet}`);
        break;
      }

      // wait then retry
      await sleep(finalDelay);
      continue;
    } catch (err: any) {
      // Network or parsing error — consider retriable
      lastError = err;
      const isNetwork = true; // treat as retriable
      if (attempt === MAX_ATTEMPTS) break;
      // exponential backoff with jitter for network errors
      const delayMs = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
      const jitterMultiplier = 1 + ((Math.random() * 2 - 1) * JITTER_FACTOR);
      const finalDelay = Math.max(0, Math.round(delayMs * jitterMultiplier));
      console.warn(`Spotify token request network error attempt ${attempt}, retrying in ${finalDelay}ms: ${err?.message ?? err}`);
      await sleep(finalDelay);
      continue;
    }
  }

  // If we reach here, all attempts exhausted
  console.warn('Spotify token request exhausted attempts', lastError);
  throw lastError || new Error('Token request failed after retries');
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  return postTokenForm(params);
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return postTokenForm(params);
}

export const spotifyAuthService = {
  exchangeCodeForTokens,
  refreshAccessToken,
};
