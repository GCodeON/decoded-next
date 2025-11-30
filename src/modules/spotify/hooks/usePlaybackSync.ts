import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSpotifyApi, useSyncPolling } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';

// Enable logs via param or env var NEXT_PUBLIC_DEBUG_SYNC=1
const ENV_DEBUG_SYNC = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEBUG_SYNC === '1';

export function usePlaybackSync(
  trackId: string,
  enabled: boolean = true,
  syncMode: boolean = false,
  viewMode: boolean = false,
  debug: boolean = ENV_DEBUG_SYNC
) {

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

  const [localProgressMs, setLocalProgressMs] = useState<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  // Derive playing state from global context
  const isPlaying = useMemo(() => {
    if (!enabled) return false;
    if (globalTrackId === trackId) return !!globalIsPlaying;
    if (webLastTrack === trackId) return !!webIsPlaying;
    return false;
  }, [enabled, globalTrackId, trackId, globalIsPlaying, webLastTrack, webIsPlaying]);

  const isPlayingThisTrack = isPlaying && globalTrackId === trackId;

  // Smooth interpolation when in sync or view mode
  const needsInterpolation = (syncMode || viewMode) && isPlayingThisTrack;

  useEffect(() => {
    if (!needsInterpolation || localProgressMs == null) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      setLocalProgressMs(prev => (prev == null ? null : prev + dt));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [needsInterpolation, localProgressMs]);

  // Use local position if recently updated, otherwise fall back to global/web
  const currentPosition = useMemo(() => {
    const now = Date.now();
    const localAge = now - lastUpdateRef.current;
    
    // Prefer interpolated local ms in sync/view mode
    if ((syncMode || viewMode) && localProgressMs != null && localAge < 3000) {
      const sec = Math.floor(localProgressMs / 1000);
      if (debug) console.log('[PlaybackSync] using local(interpolated)', { trackId, sec, ms: localProgressMs.toFixed(0), ageMs: localAge });
      return sec;
    }
    
    // Fall back to global position if this track is globally active
    if (globalTrackId === trackId && globalPosition !== null) {
      if (debug) console.log('[PlaybackSync] using global', { trackId, pos: globalPosition });
      return globalPosition;
    }
    
    // Fall back to web-only context
    if (webLastTrack === trackId && webLastPosition !== null) {
      if (debug) console.log('[PlaybackSync] using web', { trackId, pos: webLastPosition });
      return webLastPosition;
    }
    
    if (debug) console.log('[PlaybackSync] using default', { trackId, pos: 0 });
    return 0;
  }, [syncMode, viewMode, localProgressMs, globalTrackId, trackId, globalPosition, webLastTrack, webLastPosition, debug]);

  // High-frequency sync polling (250ms) when in sync mode
  const pollSync = useCallback(async () => {
    try {
      const data = await spotify.getPlaybackState();
      if (data?.item?.id === trackId && typeof data.progress_ms === 'number') {
        const ms = data.progress_ms;
        setLocalProgressMs(ms);
        lastUpdateRef.current = Date.now();
        if (debug) console.log('[PlaybackSync] poll update', { trackId, sec: Math.floor(ms / 1000), progressMs: ms });
      }
    } catch (err) {
      // Ignore errors; global polling handles them
    }
  }, [spotify, trackId, debug]);

  useSyncPolling(pollSync, {
    enabled: enabled && (syncMode || viewMode),
    intervalMs: 250 // Poll every 250ms for precise timing
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