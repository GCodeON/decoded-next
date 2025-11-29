import { useState, useCallback, useMemo, useRef } from 'react';
import { useSpotifyApi, useSyncPolling } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';

export function usePlaybackSync(trackId: string, enabled: boolean = true, syncMode: boolean = false) {

  const spotify = useSpotifyApi();
  const {
    deviceId,
    webLastPosition,
    webLastTrack,
    lastExternalDevice,
    webIsPlaying,
    globalTrackId,
    globalPosition,
    globalIsPlaying,
  } = useSpotifyPlayer();

  const [localPosition, setLocalPosition] = useState<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Derive playing state from global context
  const isPlaying = useMemo(() => {
    if (!enabled) return false;
    if (globalTrackId === trackId) return !!globalIsPlaying;
    if (webLastTrack === trackId) return !!webIsPlaying;
    return false;
  }, [enabled, globalTrackId, trackId, globalIsPlaying, webLastTrack, webIsPlaying]);

  const isPlayingThisTrack = isPlaying && globalTrackId === trackId;

  // Use local position if recently updated, otherwise fall back to global/web
  const currentPosition = useMemo(() => {
    const now = Date.now();
    const localAge = now - lastUpdateRef.current;
    
    // In sync mode, always prefer local position if available
    if (syncMode && localPosition !== null && localAge < 3000) {
      return localPosition;
    }
    
    // If local position is fresh (< 2s old) and playing, use it
    if (localPosition !== null && localAge < 2000 && isPlayingThisTrack) {
      return localPosition;
    }
    
    // Fall back to global position if this track is globally active
    if (globalTrackId === trackId && globalPosition !== null) {
      return globalPosition;
    }
    
    // Fall back to web-only context
    if (webLastTrack === trackId && webLastPosition !== null) {
      return webLastPosition;
    }
    
    return 0;
  }, [syncMode, localPosition, isPlayingThisTrack, globalTrackId, trackId, globalPosition, webLastTrack, webLastPosition]);

  // High-frequency sync polling (250ms) when in sync mode
  const pollSync = useCallback(async () => {
    try {
      const data = await spotify.getPlaybackState();
      if (data?.item?.id === trackId && typeof data.progress_ms === 'number') {
        const newPos = Math.floor(data.progress_ms / 1000);
        setLocalPosition(newPos);
        lastUpdateRef.current = Date.now();
        console.log('[usePlaybackSync] Sync poll update:', { trackId, newPos, progressMs: data.progress_ms });
      }
    } catch (err) {
      // Ignore errors; global polling handles them
    }
  }, [spotify, trackId]);

  useSyncPolling(pollSync, {
    enabled: enabled && syncMode,
    intervalMs: 500 // Poll every 500ms during sync mode for precise timing
  });

  const togglePlayback = useCallback(async () => {
    try {
      const devicesRes: any = await spotify.getDevices();
      const devices: any[] = devicesRes?.devices || [];

      let targetDeviceId: string | undefined;

      // Priority 1: Last external device (if still available)
      if (lastExternalDevice) {
        const extDevice = devices.find((d: any) => d.id === lastExternalDevice);
        if (extDevice) {
          targetDeviceId = lastExternalDevice;
        }
      }

      // Priority 2: Web player
      if (!targetDeviceId && deviceId) {
        const webDevice = devices.find((d: any) => d.id === deviceId);
        if (webDevice) {
          targetDeviceId = deviceId;
        }
      }

      // Priority 3: Any active device
      if (!targetDeviceId) {
        const activeDevice = devices.find((d: any) => d.is_active);
        if (activeDevice) {
          targetDeviceId = activeDevice.id;
        }
      }

      // Priority 4: Web player from devices list (if SDK hasn't set deviceId yet)
      if (!targetDeviceId) {
        const webDevice = devices.find((d: any) => 
          (d.name || '').includes('Web Player') || (d.name || '').includes('DECODED')
        );
        if (webDevice) {
          targetDeviceId = webDevice.id;
        }
      }

      try {
        if (isPlayingThisTrack) {
          await spotify.pause(targetDeviceId);
        } else {
          const positionMs = Math.floor(currentPosition * 1000);
          await spotify.play(targetDeviceId || undefined, [`spotify:track:${trackId}`], positionMs);
        }
      } catch (err: any) {
        // If 404 or "no active device", transfer and retry
        const msg = String(err?.message || '');
        if (err?.response?.status === 404 || msg.includes('device') || msg.includes('404')) {
          if (targetDeviceId) {
            await spotify.transferPlayback(targetDeviceId, true);
            // Retry play
            const positionMs = Math.floor(currentPosition * 1000);
            await spotify.play(targetDeviceId, [`spotify:track:${trackId}`], positionMs);
          }
        }
      }
    } catch (err: any) {
      // Silent in production
    }
  }, [
    isPlayingThisTrack,
    currentPosition,
    trackId,
    deviceId,
    lastExternalDevice,
    spotify,
  ]);

  return {
    isPlaying,
    currentPosition,
    togglePlayback,
  };
}