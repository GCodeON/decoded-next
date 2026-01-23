'use client'
import { useCallback, useMemo } from 'react';
import { useSpotifyPlayer } from '@/modules/player';
import { usePlaybackToggle } from './usePlaybackToggle';

export function useSimplePlayback(trackId: string | null | undefined) {
  const {
    deviceId,
    lastExternalDevice,
    globalTrackId,
    globalPosition,
    globalIsPlaying,
  } = useSpotifyPlayer();

  const isPlaying = useMemo(() => {
    return !!(trackId && globalTrackId === trackId && globalIsPlaying);
  }, [trackId, globalTrackId, globalIsPlaying]);

  const getPositionMs = useCallback(() => {
    if (trackId === globalTrackId && globalPosition !== null) {
      return Math.floor(globalPosition * 1000);
    }
    return 0;
  }, [trackId, globalTrackId, globalPosition]);

  const { togglePlayback } = usePlaybackToggle(
    trackId || '',
    isPlaying,
    getPositionMs,
    {
      deviceId,
      lastExternalDevice,
    }
  );

  return {
    isPlaying,
    togglePlayback: trackId ? togglePlayback : undefined,
  };
}
