import { useCallback } from 'react';

export const useSpotifyApi = () => {
  const spotifyApi = useCallback(async (endpoint: string) => {
    const res = await fetch(`/api/spotify${endpoint}`, {
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    return await res.json();
  }, []);

  return { spotifyApi };
};