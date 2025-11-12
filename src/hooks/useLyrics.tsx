import { useState, useEffect, useCallback } from 'react';

interface LyricsResult {
  title: string;
  lyrics: {
    plain: string;
    synced: string | null;
    rhymeEncoded: string;
  };
}

export function useLyrics(artist: string, song: string, album: string, duration: number) {
  const [data, setData] = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!artist || !song) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/lyrics?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(song)}&album=${encodeURIComponent(album)}&duration=${encodeURIComponent(duration)}`
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to fetch lyrics');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [artist, song]);

  useEffect(() => {
    search();
  }, [search]);

  return { data, loading, error };
}