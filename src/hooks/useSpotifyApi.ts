import { useCallback } from 'react';
import { SpotifyRequestOptions } from '@/types/spotify';

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