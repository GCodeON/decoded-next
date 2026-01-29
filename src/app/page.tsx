"use client";
import { useState, useRef, useCallback } from 'react';
import { useSpotifyApi, useSafePolling, useSimplePlayback } from '@/modules/spotify';
import SongHeader from '@/components/SongHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import LatestEncoded from '@/components/LatestEncoded';


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
    <div className="flex flex-col items-center md:py-8 space-y-8">
      <div className="w-full max-w-7xl">
        { currentTrack ? (
          <div className="bg-black rounded-xl shadow-lg p-6 mb-4">
            <SongHeader 
              track={currentTrack} 
              isPlaying={isPlaying} 
              togglePlayback={togglePlayback}
              showTitle={true}
              title="Currently Playing"
            />
          </div>
        ) : ('')}
      </div>

      {/* Featured Carousel */}
      <div className="w-full max-w-7xl">
        <LatestEncoded 
          limit={10}
          title={isPlaying ? 'Other Tracks' : 'Recently Encoded Tracks'}
          showCount={false}
          showCompleteTag={false}
          showTitle={true}
          itemsPerPage={{ mobile: 1, tablet: 2, desktop: 3 }}
          randomize={true}
        />
      </div>
    </div>
  );
}