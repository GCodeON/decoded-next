import { useState } from 'react';

export const useSpotifyApi = () => {
  const [loading, setLoading] = useState(false);

  const spotifyApi = async <T>(endpoint: string, init?: RequestInit): Promise<T> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spotify${endpoint}`, {
        ...init,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Unknown error');
      }
      return await res.json();
    } finally {
      setLoading(false);
    }
  };

  return { spotifyApi, loading };
};