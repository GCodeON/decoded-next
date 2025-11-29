import { useState, useCallback } from 'react';
import { useSpotifyApi, useSafePolling } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';

export function usePlaybackSync(trackId: string, enabled: boolean = true) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);

  const spotify = useSpotifyApi();
  const {
    deviceId,
    webLastPosition,
    webLastTrack,
    setLastExternalDevice,
    setWebLastPosition,
    setWebLastTrack,
  } = useSpotifyPlayer();

  const pollPlayback = useCallback(async () => {
    const data = await spotify.getPlaybackState();

    // Handle device tracking
    if (data?.device?.id) {
      const currentDeviceId = data.device.id;
      if (deviceId && currentDeviceId === deviceId) {
        if (typeof data.progress_ms === 'number') {
          setWebLastPosition(Math.floor(data.progress_ms / 1000));
        }
        if (data.item?.id) {
          setWebLastTrack(data.item.id);
        }
      } else {
        setLastExternalDevice(currentDeviceId);
      }
    }

    // Update playback state for current track
    if (data?.item?.id === trackId) {
      setIsPlaying(!!data.is_playing);
      setCurrentPosition((data.progress_ms || 0) / 1000);
    } else {
      setIsPlaying(false);
      setCurrentPosition(0);
    }
  }, [trackId, spotify, deviceId, setLastExternalDevice, setWebLastPosition, setWebLastTrack]);

  useSafePolling(pollPlayback, {
    enabled,
    baseMs: 1000,
    maxMs: 10000,
    onAuthError: () => {
      setIsPlaying(false);
      setCurrentPosition(0);
    }
  });

  const togglePlayback = useCallback(async () => {
    try {
      if (isPlaying) {
        await spotify.pause();
        return;
      }

      // Try to get active device
      let targetDeviceId: string | undefined;
      try {
        const devicesData: any = await spotify.getPlaybackState();
        const devices = devicesData?.devices || [];
        const active = devices?.find((d: any) => d.is_active);
        targetDeviceId = active?.id;
      } catch (_) {}

      // Fallback to web player device
      const deviceToUse = targetDeviceId || deviceId;

      let positionMs = Math.floor(currentPosition * 1000);
      if (!positionMs && webLastTrack === trackId && typeof webLastPosition === 'number') {
        positionMs = webLastPosition * 1000;
      }

      await spotify.play(undefined, [`spotify:track:${trackId}`], positionMs);
    } catch (err: any) {
      console.error('Toggle playback failed:', err.message);
    }
  }, [
    isPlaying,
    currentPosition,
    trackId,
    deviceId,
    webLastPosition,
    webLastTrack,
    spotify,
  ]);

  return {
    isPlaying,
    currentPosition,
    togglePlayback,
    pollPlayback,
  };
}