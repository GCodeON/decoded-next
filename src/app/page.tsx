"use client";
import { useEffect, useState, useRef } from 'react';
import { useSpotifyApi } from '@/hooks/spotify/useSpotifyApi';
import Track from '@/components/track';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const currentTrackIdRef = useRef<string | null>(null);

  const { spotifyApi } = useSpotifyApi();

  const fetchCurrentlyPlaying = async () => {
    try {
      const data = await spotifyApi('/me/player/currently-playing');

      const newTrack = data?.item || null;

      if (newTrack?.id !== currentTrackIdRef.current) {
        currentTrackIdRef.current = newTrack?.id;
        setCurrentTrack(newTrack);
      }
    } catch (err: any) {
      console.error('Failed to fetch currently playing:', err.message);
 
      if (currentTrackIdRef.current !== null) {
        currentTrackIdRef.current = null;
        setCurrentTrack(null);
      }
    } finally {
      if (isInitialLoading) {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCurrentlyPlaying();

    const interval = setInterval(fetchCurrentlyPlaying, 3000);

    return () => clearInterval(interval);
  }, [spotifyApi]);

  return (
    <div className="flex justify-center py-8">
      {isInitialLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : currentTrack ? (
        <Track key={currentTrack.id} active={currentTrack} />
      ) : (
        <p className="text-sm text-gray-400">No track playing right now.</p>
      )}
    </div>
  );
}