import axios, { AxiosInstance } from 'axios';

let clientCredentialsToken: { token: string; expiresAt: number } | null = null;

// Get Client Credentials access token for public endpoints
async function getClientCredentialsToken(): Promise<string> {
  const now = Date.now();
  
  if (clientCredentialsToken && clientCredentialsToken.expiresAt > now) {
    return clientCredentialsToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('SPOTIFY_CLIENT_ID or NEXT_PUBLIC_SPOTIFY_CLIENT_ID');
    if (!clientSecret) missing.push('SPOTIFY_CLIENT_SECRET');
    throw new Error(
      `Missing Spotify credentials: ${missing.join(', ')}. ` +
      `Set these in your .env.local file to enable public song viewing.`
    );
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;
    clientCredentialsToken = {
      token: access_token,
      expiresAt: now + expires_in * 1000 - 60000, // Refresh 1 minute before expiry
    };

    console.log('[Spotify] Client Credentials token obtained successfully');
    return access_token;
  } catch (error: any) {
    console.error('Failed to get Client Credentials token:', error.response?.data || error.message);
    throw new Error(
      `Failed to authenticate with Spotify: ${error.response?.data?.error_description || error.message}`
    );
  }
}

// Factory that creates a configured Axios instance for Spotify Web API.
export const createSpotifyAxios = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: 'https://api.spotify.com/v1',
    headers: { 'Content-Type': 'application/json' },
  });

  // Attach access token from cookies (server-side only context)
  instance.interceptors.request.use(
    async (config) => {
      let accessToken: string | undefined;
      
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        accessToken = cookieStore.get('spotify_access_token')?.value;
      } catch (error) {
        // Cookies not available (likely client-side or edge runtime)
        console.log('[Spotify] Cookies not available, will use client credentials');
      }
      
      if (accessToken) {
        console.log('[Spotify] Using user access token');
        config.headers.Authorization = `Bearer ${accessToken}`;
        (config as any).authType = 'user';
      } else {
        // Use Client Credentials for public endpoints when user not authenticated
        console.log('[Spotify] No user token, requesting Client Credentials token...');
        try {
          const clientToken = await getClientCredentialsToken();
          config.headers.Authorization = `Bearer ${clientToken}`;
          (config as any).authType = 'client';
        } catch (error: any) {
          console.error('[Spotify] Failed to get client credentials:', error.message);
          throw new Error(`Failed to authenticate with Spotify: ${error.message}`);
        }
      }
      
      return config;
    },
    (err) => Promise.reject(err)
  );

  // Retry public GET requests with client token when user token expires.
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const status = error?.response?.status;
      const original = error?.config;
      const authType = original?.authType;
      const url = original?.url || '';
      const method = (original?.method || 'get').toLowerCase();
      const isPublic =
        method === 'get' &&
        (url.startsWith('/tracks') ||
          url.startsWith('/albums') ||
          url.startsWith('/artists') ||
          url.startsWith('/audio-analysis') ||
          url.startsWith('/audio-features') ||
          url.startsWith('/search'));

      if (status === 401 && authType === 'user' && isPublic) {
        const clientToken = await getClientCredentialsToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${clientToken}`;
        original.authType = 'client';
        return instance.request(original);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Convenience default export matching previous api-client usage.
export default function spotifyClient(): AxiosInstance {
  return createSpotifyAxios();
}
