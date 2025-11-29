"use client";
import { useState, useEffect } from 'react';
import { useSpotifyApi } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';
import Track from '@/components/TrackCard';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { globalTrackId, globalIsPlaying } = useSpotifyPlayer();
  const spotify = useSpotifyApi();

  // Fetch full track details only when track id changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!globalTrackId) {
        setCurrentTrack(null);
        if (isInitialLoading) setIsInitialLoading(false);
        return;
      }
      try {
        const track = await spotify.getTrack(globalTrackId);
        if (!cancelled) {
          setCurrentTrack(track);
          if (isInitialLoading) setIsInitialLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCurrentTrack(null);
          if (isInitialLoading) setIsInitialLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [globalTrackId, spotify, isInitialLoading]);

  return (
    <div className="flex justify-center py-8">
      {isInitialLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : currentTrack && globalIsPlaying ? (
        <Track key={currentTrack.id} active={currentTrack} />
      ) : (
        <p className="text-sm text-gray-400">No track playing right now.</p>
      )}
    </div>
  );
}