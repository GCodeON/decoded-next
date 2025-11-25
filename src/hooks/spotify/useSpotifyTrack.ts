import { useState, useEffect } from 'react';
import { useSpotifyApi } from '@/hooks/spotify/useSpotifyApi';
import { SpotifyTrack } from '@/types/spotify';

export function useSpotifyTrack(trackId: string) {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { spotifyApi } = useSpotifyApi();

  useEffect(() => {
    if (!trackId) {
      setTrack(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchTrack = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await spotifyApi(`/tracks/${trackId}`);
        if (mounted) setTrack(data);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load track');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTrack();

    return () => { mounted = false; };
  }, [trackId, spotifyApi]);

  return { track, loading, error };
}