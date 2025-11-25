import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpotifyApi } from '@/hooks/spotify/useSpotifyApi';
import { useSpotifyPlayer } from '@/context/spotifyPlayerContext';

export function usePlaybackSync(trackId: string, enabled: boolean = true) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { spotifyApi } = useSpotifyApi();
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
      const data = await spotifyApi(`/me/player`);

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
    } catch (err) {
      console.error('Playback polling failed:', err);
    }
  }, [trackId, spotifyApi, deviceId, setLastExternalDevice, setWebLastPosition, setWebLastTrack]);

  const togglePlayback = useCallback(async () => {
    try {
      if (isPlaying) {
        await spotifyApi('/me/player/pause', { method: 'PUT' });
        return;
      }

      // Try to get active device
      let targetDeviceId: string | undefined;
      try {
        const { devices } = await spotifyApi('/me/player/devices');
        const active = devices?.find((d: any) => d.is_active);
        targetDeviceId = active?.id;
      } catch (_) {}

      // Fallback to web player device
      const deviceToUse = targetDeviceId || deviceId;

      let positionMs = Math.floor(currentPosition * 1000);
      if (!positionMs && webLastTrack === trackId && typeof webLastPosition === 'number') {
        positionMs = webLastPosition * 1000;
      }

      await spotifyApi(`/me/player/play${deviceToUse ? `?device_id=${deviceToUse}` : ''}`, {
        method: 'PUT',
        body: {
          uris: [`spotify:track:${trackId}`],
          position_ms: positionMs,
        },
      });
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
    spotifyApi,
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