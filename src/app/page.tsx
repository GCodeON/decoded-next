"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSpotifyApi } from '@/modules/spotify';
import Track from '@/components/TrackCard';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const currentTrackIdRef = useRef<string | null>(null);

  const spotify = useSpotifyApi();

  const fetchCurrentlyPlaying = useCallback(async () => {
    try {
      const newTrack = await spotify.getCurrentlyPlaying();

      if (newTrack?.id !== currentTrackIdRef.current) {
        currentTrackIdRef.current = newTrack?.id ?? null;
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
  }, [spotify, isInitialLoading]);

  useEffect(() => {
    fetchCurrentlyPlaying();

    const interval = setInterval(fetchCurrentlyPlaying, 3000);

    return () => clearInterval(interval);
  }, [fetchCurrentlyPlaying]);

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