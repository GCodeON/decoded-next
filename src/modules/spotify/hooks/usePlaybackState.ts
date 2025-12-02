'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useSpotifyApi } from './useSpotifyApi';
import { useSpotifyPlayer } from '@/modules/player';

/**
 * Global playback state hook with adaptive polling.
 * Polls at different intervals based on playing state and visibility:
 * - 2.5s when actively playing
 * - 15s when paused
 * - 30s when tab is hidden
 * @param enabled - Whether polling should be active (default: true)
 */
export function usePlaybackState(enabled: boolean = true) {
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
  const isPollingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const baseIntervalRef = useRef(2500);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const pollOnce = useCallback(async () => {
    if (isPollingRef.current) return; // concurrency guard
    isPollingRef.current = true;
    try {
      const data = await spotify.getPlaybackState();
      if (!data) {
        setGlobalIsPlaying(false);
        return;
      }

      const newTrackId = data.item?.id || null;
      const newPosition = typeof data.progress_ms === 'number' ? Math.floor(data.progress_ms / 1000) : null;
      const newIsPlaying = !!data.is_playing;
      const currentDeviceId = data.device?.id || null;
      const isWebPlayer = currentDeviceId && currentDeviceId === deviceId;

      if (!newTrackId) {
        setGlobalIsPlaying(false);
        return;
      }

      const sig = `${newTrackId}:${newPosition}:${newIsPlaying}:${currentDeviceId || ''}:${isWebPlayer}`;
      if (sig === lastStateRef.current?.sig) {
        // State unchanged; still update interval adaptively below
      } else {
        if (lastStateRef.current?.trackId !== newTrackId) setGlobalTrackId(newTrackId);
        if (newPosition !== null && lastStateRef.current?.position !== newPosition) setGlobalPosition(newPosition);
        if (lastStateRef.current?.isPlaying !== newIsPlaying) setGlobalIsPlaying(newIsPlaying);

        if (currentDeviceId && !isWebPlayer) {
          setLastExternalDevice(currentDeviceId);
        }

        if (isWebPlayer) {
          if (lastStateRef.current?.webTrack !== newTrackId) setWebLastTrack(newTrackId);
          if (newPosition !== null && lastStateRef.current?.webPosition !== newPosition) setWebLastPosition(newPosition);
          if (lastStateRef.current?.webIsPlaying !== newIsPlaying) setWebIsPlaying(newIsPlaying);
        }
      }

      // Adjust interval target
      if (!isVisibleRef.current) baseIntervalRef.current = 30000; // hidden
      else if (newIsPlaying) baseIntervalRef.current = 2500; // playing
      else baseIntervalRef.current = 15000; // paused

      lastStateRef.current = {
        sig,
        trackId: newTrackId,
        position: newPosition,
        isPlaying: newIsPlaying,
        webTrack: isWebPlayer ? newTrackId : lastStateRef.current?.webTrack,
        webPosition: isWebPlayer ? newPosition : lastStateRef.current?.webPosition,
        webIsPlaying: isWebPlayer ? newIsPlaying : lastStateRef.current?.webIsPlaying,
      };
    } catch (err) {
      // Log once per error class could be added; keep silent for now
    } finally {
      isPollingRef.current = false;
    }
  }, [spotify, deviceId, setGlobalIsPlaying, setGlobalTrackId, setGlobalPosition, setWebLastTrack, setWebLastPosition, setWebIsPlaying, setLastExternalDevice]);

  useEffect(() => {
    if (!enabled) return; // Don't start polling if disabled
    
    let active = true;
    const schedule = () => {
      if (!active) return;
      pollOnce().finally(() => {
        if (!active) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const interval = baseIntervalRef.current;
        timeoutRef.current = setTimeout(schedule, interval);
      });
    };
    schedule();
    return () => {
      active = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pollOnce, enabled]);
}
