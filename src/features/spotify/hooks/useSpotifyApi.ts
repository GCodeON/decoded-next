import { useCallback } from 'react';
import { SpotifyRequestOptions } from '@/features/spotify/types/spotify';

export const useSpotifyApi = () => {
  const spotifyApi = useCallback(
    async (
      endpoint: string,
      options?: SpotifyRequestOptions
    ) => {
      const { method = 'GET', body, headers, ...rest } = options || {};
      const res = await fetch(`/api/spotify${endpoint}`, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(headers || {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        ...rest,
      });

      if (res.status === 204) return null;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Unexpected HTML response (status ${res.status}): ${text.slice(0, 200)}`
        );
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      try {
        return await res.json();
      } catch (e: any) {
        throw new Error(
          `Failed to parse JSON response (status ${res.status}): ${e.message}`
        );
      }
    },
    []
  );

  return { spotifyApi };
};

export const tokenRefresh = async (refreshToken: string, retries = 2): Promise<Response> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // For 5xx errors, retry with exponential backoff
      if (response.status >= 500 && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.warn(`Spotify refresh attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (err) {
      // Network error - retry if attempts remaining
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.warn(`Spotify refresh network error on attempt ${attempt + 1}, retrying in ${delay}ms:`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('All refresh attempts failed');
}
