'use client';

import { useEffect, useState } from 'react';
import Track from '@/components/track';
import { useSpotifyApi } from '@/hooks/useSpotifyApi';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const { spotifyApi, loading } = useSpotifyApi();

  const fetchCurrentlyPlaying = async () => {
    try {
      const data = await spotifyApi('/me/player/currently-playing');
      if (data?.item) {
        setCurrentTrack(data.item);
      } else {
        setCurrentTrack(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch currently playing:', err.message);
      setCurrentTrack(null);
    }
  };

  useEffect(() => {
    fetchCurrentlyPlaying();

    // const interval = setInterval(fetchCurrentlyPlaying, 30_000);
    // return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center py-8">
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : currentTrack ? (
        <Track active={currentTrack} />
      ) : (
        <p className="text-sm text-gray-400">No track playing right now.</p>
      )}
    </div>
  );
}
