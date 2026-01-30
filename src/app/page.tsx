"use client";
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSpotifyApi, useSafePolling, useSimplePlayback } from '@/modules/spotify';
import SongHeader from '@/components/SongHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import LatestEncoded from '@/components/LatestEncoded';
import useAuth from '@/modules/auth/hooks/useAuth';


export default function Home() {
  const { isAuthenticated, isChecking } = useAuth();
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
    enabled: isAuthenticated && !isChecking,
    baseMs: 3000,
    maxMs: 30000,
    onAuthError: () => {
      currentTrackIdRef.current = null;
      setCurrentTrack(null);
    }
  });

  // Public landing page for unauthenticated users
  if (!isAuthenticated && !isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 px-6">
        <div className="text-center space-y-4 max-w-2xl">
          <h2 className="text-5xl md:text-6xl font-bold text-white">
            Welcome to <span className="text-blue-500">DECODED</span>
          </h2>
          <p className="text-xl text-gray-300">
            Explore and create encoded rap lyrics with perfect rhyme highlighting and synchronization.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Login
          </Link>
          <Link 
            href="/register"
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Encode Lyrics</h3>
            <p className="text-gray-300 text-sm">Create and manage encoded lyrics with advanced synchronization</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Rhyme Analysis</h3>
            <p className="text-gray-300 text-sm">Explore rhyme patterns with color-coded visualization</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Spotify Integration</h3>
            <p className="text-gray-300 text-sm">Seamlessly connect your Spotify account to discover new tracks</p>
          </div>
        </div>

        {/* Show LatestEncoded as teaser */}
        <div className="w-full max-w-7xl mt-12">
          <h3 className="text-2xl font-bold text-white mb-6">Featured Encoded Tracks</h3>
          <LatestEncoded 
            limit={6}
            showCount={false}
            showCompleteTag={false}
            showTitle={false}
            itemsPerPage={{ mobile: 1, tablet: 2, desktop: 3 }}
            randomize={true}
          />
        </div>
      </div>
    );
  }

  // Authenticated user view
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