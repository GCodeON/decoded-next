import { useCallback } from 'react';

interface SpotifyRequestOptions {
  method?: string;
  body?: any;
  headers?: any
}

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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      return await res.json();
    },
    []
  );

  return { spotifyApi };
};