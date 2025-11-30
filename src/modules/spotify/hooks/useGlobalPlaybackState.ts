'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useSpotifyApi } from './useSpotifyApi';
import { useSpotifyPlayer } from '@/modules/player';
import { useSafePolling } from './useSafePolling';

/**
 * Global playback state hook with adaptive polling.
 * Polls at different intervals based on playing state and visibility:
 * - 2.5s when actively playing
 * - 15s when paused
 * - 30s when tab is hidden
 */
export function useGlobalPlaybackState() {
  const spotify = useSpotifyApi();
  const {
    deviceId,
    setLastExternalDevice,
    setWebLastPosition,
    setWebLastTrack,
    setWebIsPlaying,
    setGlobalTrackId,
    setGlobalPosition,
    setGlobalIsPlaying,
  } = useSpotifyPlayer();

  const lastStateRef = useRef<any>(null);
  const isVisibleRef = useRef(true);
  const currentIntervalRef = useRef(2500);

  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const pollPlayback = useCallback(async () => {
    const data = await spotify.getPlaybackState();

    const newTrackId = data?.item?.id || null;
    const newPosition = data?.progress_ms ? Math.floor(data.progress_ms / 1000) : 0;
    const newIsPlaying = data?.is_playing ?? false;
    const currentDeviceId = data?.device?.id || null;
    const isWebPlayer = currentDeviceId && currentDeviceId === deviceId;

    if (!newTrackId) {
      // No active playback or nothing loaded
      setGlobalIsPlaying(false);
      return;
    }

    // Update global state
    if (lastStateRef.current?.trackId !== newTrackId) {
      setGlobalTrackId(newTrackId);
    }
    if (lastStateRef.current?.position !== newPosition) {
      setGlobalPosition(newPosition);
    }
    if (lastStateRef.current?.isPlaying !== newIsPlaying) {
      setGlobalIsPlaying(newIsPlaying);
    }

    // Track device-specific state
    if (currentDeviceId && !isWebPlayer) {
      setLastExternalDevice(currentDeviceId);
    }

    if (isWebPlayer) {
      if (lastStateRef.current?.webTrack !== newTrackId) {
        setWebLastTrack(newTrackId);
      }
      if (lastStateRef.current?.webPosition !== newPosition) {
        setWebLastPosition(newPosition);
      }
      if (lastStateRef.current?.webIsPlaying !== newIsPlaying) {
        setWebIsPlaying(newIsPlaying);
      }
    }

    // Adjust polling interval based on state
    if (!isVisibleRef.current) {
      currentIntervalRef.current = 30000; // 30s when hidden
    } else if (newIsPlaying) {
      currentIntervalRef.current = 2500; // 2.5s when playing
    } else {
      currentIntervalRef.current = 15000; // 15s when paused
    }

    lastStateRef.current = {
      trackId: newTrackId,
      position: newPosition,
      isPlaying: newIsPlaying,
      webTrack: isWebPlayer ? newTrackId : lastStateRef.current?.webTrack,
      webPosition: isWebPlayer ? newPosition : lastStateRef.current?.webPosition,
      webIsPlaying: isWebPlayer ? newIsPlaying : lastStateRef.current?.webIsPlaying,
    };
  }, [
    spotify,
    deviceId,
    setLastExternalDevice,
    setWebLastPosition,
    setWebLastTrack,
    setWebIsPlaying,
    setGlobalTrackId,
    setGlobalPosition,
    setGlobalIsPlaying,
  ]);

  useSafePolling(pollPlayback, {
    enabled: true,
    baseMs: currentIntervalRef.current,
    maxMs: 30000,
  });
}
