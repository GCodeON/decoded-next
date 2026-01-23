"use client";
import { useState, useRef, useCallback } from 'react';
import { useSpotifyApi, useSafePolling, useSimplePlayback } from '@/modules/spotify';
import SongHeader from '@/components/SongHeader';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const currentTrackIdRef = useRef<string | null>(null);

  const spotify = useSpotifyApi();
  const { isPlaying, togglePlayback } = useSimplePlayback(currentTrack?.id);

  const fetchCurrentlyPlaying = useCallback(async () => {
    const newTrack = await spotify.getCurrentlyPlaying();

    if (newTrack?.id !== currentTrackIdRef.current) {
      currentTrackIdRef.current = newTrack?.id ?? null;
      setCurrentTrack(newTrack);
    }

    if (isInitialLoading) setIsInitialLoading(false);
  }, [spotify, isInitialLoading]);

  useSafePolling(fetchCurrentlyPlaying, {
    enabled: true,
    baseMs: 3000,
    maxMs: 30000,
    onAuthError: () => {
      currentTrackIdRef.current = null;
      setCurrentTrack(null);
    }
  });

  return (
    <div className="flex justify-center py-8">
      {isInitialLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : currentTrack ? (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-0">
          <SongHeader 
            track={currentTrack} 
            isPlaying={isPlaying} 
            togglePlayback={togglePlayback}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-400">No track playing right now.</p>
      )}
    </div>
  );
}