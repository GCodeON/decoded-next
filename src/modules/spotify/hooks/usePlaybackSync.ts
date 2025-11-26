import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpotifyApi } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';

export function usePlaybackSync(trackId: string, enabled: boolean = true) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    try {
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
    } catch (err: any) {
      // Only log non-auth errors to reduce noise
      if (!err?.message?.includes('Token refresh failed') && !err?.message?.includes('log in again')) {
        console.error('Playback polling failed:', err);
      }
    }
  }, [trackId, spotify, deviceId, setLastExternalDevice, setWebLastPosition, setWebLastTrack]);

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

      await spotify.play(deviceToUse || undefined, [`spotify:track:${trackId}`], positionMs);
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

  useEffect(() => {
    if (!enabled) {
      setIsPlaying(false);
      setCurrentPosition(0);
      return;
    }

    pollPlayback();
    pollIntervalRef.current = setInterval(pollPlayback, 1000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [enabled, pollPlayback]);

  return {
    isPlaying,
    currentPosition,
    togglePlayback,
    pollPlayback,
  };
}