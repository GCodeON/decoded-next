'use client'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSpotifyApi, useSyncPolling } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';
import { usePlaybackToggle } from './usePlaybackToggle';

export function usePlaybackSync(
  trackId: string,
  enabled: boolean = true,
  syncMode: boolean = false,
  viewMode: boolean = false
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


  const lastPollIsPlayingRef = useRef<boolean | null>(null);
  const optimisticPlayUntilRef = useRef<number>(0);

  const lastSampleMsRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef<number>(performance.now());
  const lastLoggedSecondRef = useRef<number | null>(null);
 
  const [currentInterpolatedMs, setCurrentInterpolatedMs] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const currentInterpolatedMsRef = useRef<number | null>(null);
  useEffect(() => {
    currentInterpolatedMsRef.current = currentInterpolatedMs;
  }, [currentInterpolatedMs]);
  const isInterpolatingRef = useRef(false);


  const isPlaying = useMemo(() => {
    if (!enabled) return false;

    const pollPlay = lastPollIsPlayingRef.current;

    if ((syncMode || viewMode) && performance.now() < optimisticPlayUntilRef.current) {
      return true;
    }
    if ((syncMode || viewMode) && pollPlay !== null) {
      return pollPlay === true;
    }
    if (globalTrackId === trackId) return !!globalIsPlaying;
    if (webLastTrack === trackId) return !!webIsPlaying;
    return false;
  }, [enabled, globalTrackId, trackId, globalIsPlaying, webLastTrack, webIsPlaying, syncMode, viewMode, currentInterpolatedMs]);

  const isPlayingThisTrack = isPlaying && globalTrackId === trackId;

  const needsInterpolation = (syncMode || viewMode) && isPlayingThisTrack;

  const lastGlobalPositionRef = useRef<number | null>(null);

  useEffect(() => {
    if (needsInterpolation && globalTrackId === trackId && globalPosition !== null) {
      const globalMs = globalPosition * 1000;
      const lastGlobal = lastGlobalPositionRef.current;
      const currentBaseline = lastSampleMsRef.current;
      
      if (lastGlobal !== null && currentBaseline !== null) {
        const globalDelta = globalMs - lastGlobal;
        const driftFromBaseline = Math.abs(globalMs - currentBaseline);
        
        // Detect seek: global jumped significantly AND is far from our baseline
        if (Math.abs(globalDelta) > 2000 && driftFromBaseline > 1000) {
          lastSampleMsRef.current = globalMs;
          lastSampleAtRef.current = performance.now();
        }
      }
      
      lastGlobalPositionRef.current = globalMs;
    }
  }, [needsInterpolation, globalTrackId, trackId, globalPosition]);

  useEffect(() => {
    if (needsInterpolation && lastSampleMsRef.current == null) {

      if (globalTrackId === trackId && globalPosition !== null) {
        lastSampleMsRef.current = globalPosition * 1000;
        lastSampleAtRef.current = performance.now();
        lastGlobalPositionRef.current = globalPosition * 1000;

      }
    }
  }, [needsInterpolation, globalTrackId, trackId, globalPosition]);

  useEffect(() => {
    if (!needsInterpolation) {
      isInterpolatingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    

    if (lastSampleMsRef.current != null && !isInterpolatingRef.current) {
      isInterpolatingRef.current = true;
      const tick = () => {
        const baselineMs = lastSampleMsRef.current;
        if (baselineMs != null && isInterpolatingRef.current) {
          const elapsed = performance.now() - lastSampleAtRef.current;
          const clampedElapsed = Math.min(elapsed, 2000);
          setCurrentInterpolatedMs(baselineMs + clampedElapsed);
        }
        if (isInterpolatingRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    
    return () => {
      isInterpolatingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [needsInterpolation]);

  const currentPosition = useMemo(() => {
    if (currentInterpolatedMs != null) {
      const sec = Math.floor(currentInterpolatedMs / 1000);
      return sec;
    }
    // Fallback chain
    if (globalTrackId === trackId && globalPosition !== null) {
      return globalPosition;
    }
    if (webLastTrack === trackId && webLastPosition !== null) {
      return webLastPosition;
    }
    return 0;
  }, [needsInterpolation, currentInterpolatedMs, trackId, globalTrackId, globalPosition, webLastTrack, webLastPosition]);

  // High-frequency sync polling when in sync/view modes; faster cadence for responsiveness
  const pollSync = useCallback(async () => {
    try {
      const data = await spotify.getPlaybackState();
      if (data?.item?.id === trackId && typeof data.progress_ms === 'number') {
        const newMs = data.progress_ms;
        const now = performance.now();
        const prev = lastSampleMsRef.current;
        const isPlayingNow = data.is_playing === true;
        const inOptimisticWindow = performance.now() < optimisticPlayUntilRef.current;
        const effectiveIsPlaying = isPlayingNow || inOptimisticWindow;
        lastPollIsPlayingRef.current = isPlayingNow;
        
        // Detect play/pause state changes for immediate response
        const shouldInterpolate = (syncMode || viewMode) && effectiveIsPlaying;
        
        // When interpolating, check if new sample would cause backwards jump
        if (shouldInterpolate && prev != null && currentInterpolatedMs != null) {
          const currentInterpolatedValue = currentInterpolatedMs;
          const diff = newMs - prev;
          
          // Large backward jump -> seek/restart; accept immediately
          if (diff < -2000) {
            
            lastSampleMsRef.current = newMs;
            lastSampleAtRef.current = now;
          } else if (newMs <= currentInterpolatedValue) {
            // Poll sample is at or behind interpolation - reject to prevent any backwards movement
            return;
          } else {
            // Sample is ahead of interpolation - use it
            lastSampleMsRef.current = newMs;
            lastSampleAtRef.current = now;
          }
        } else {
          if (prev != null) {
            const diff = newMs - prev;
            if (diff < -2000) {
             
            } else if (diff < -150) {

 
              return;
            }
          }
          lastSampleMsRef.current = newMs;
          lastSampleAtRef.current = now;
        }
        
        if (shouldInterpolate && !isInterpolatingRef.current) {
          isInterpolatingRef.current = true;
          rafRef.current = requestAnimationFrame(tickStable);
        }
        
        // Stop interpolation immediately if paused
        if (!isPlayingNow && !inOptimisticWindow && isInterpolatingRef.current) {
          isInterpolatingRef.current = false;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      }
    } catch (err) {
      
    }
  }, [spotify, trackId, syncMode, viewMode]);

  // Stable tick function outside pollSync to avoid recreation on every render
  const tickStable = () => {
    const baselineMs = lastSampleMsRef.current;
    if (baselineMs != null && isInterpolatingRef.current) {
      const elapsed = performance.now() - lastSampleAtRef.current;
      const clampedElapsed = Math.min(elapsed, 2000);
      // Only update state if value actually changed to avoid extra renders
      const newMs = baselineMs + clampedElapsed;
      if (currentInterpolatedMsRef.current !== newMs) {
        setCurrentInterpolatedMs(newMs);
      }
    }
    if (isInterpolatingRef.current) {
      rafRef.current = requestAnimationFrame(tickStable);
    }
  };

  useSyncPolling(pollSync, {
    enabled: enabled && (syncMode || viewMode),
    intervalMs: (syncMode || viewMode) ? 1000 : 2500
  });

  // Calculate current playback position for usePlaybackToggle
  const getPositionMs = useCallback(() => {
    if (typeof currentInterpolatedMs === 'number') return Math.floor(currentInterpolatedMs);
    if (typeof lastSampleMsRef.current === 'number') return Math.floor(lastSampleMsRef.current!);
    if (globalTrackId === trackId && globalPosition !== null) return Math.floor(globalPosition * 1000);
    return Math.floor(currentPosition * 1000);
  }, [currentInterpolatedMs, currentPosition, globalTrackId, trackId, globalPosition]);

  // Use the reusable playback toggle hook with interpolation callbacks
  const { togglePlayback: coreToggle } = usePlaybackToggle(
    trackId,
    isPlayingThisTrack,
    getPositionMs,
    {
      deviceId,
      lastExternalDevice,
      onPlayStart: (syncMode || viewMode) ? async () => {
        // Optimistically start interpolation BEFORE API call
        lastPollIsPlayingRef.current = true;
        optimisticPlayUntilRef.current = performance.now() + 2000;
        const positionMs = getPositionMs();
        lastSampleMsRef.current = positionMs;
        lastSampleAtRef.current = performance.now();
        setCurrentInterpolatedMs(positionMs);

        if (!isInterpolatingRef.current) {
          isInterpolatingRef.current = true;
          const tick = () => {
            const baselineMs = lastSampleMsRef.current;
            if (baselineMs != null && isInterpolatingRef.current) {
              const elapsed = performance.now() - lastSampleAtRef.current;
              const clampedElapsed = Math.min(elapsed, 2000);
              setCurrentInterpolatedMs(baselineMs + clampedElapsed);
            }
            if (isInterpolatingRef.current) {
              rafRef.current = requestAnimationFrame(tick);
            }
          };
          rafRef.current = requestAnimationFrame(tick);
        }
      } : undefined,
      onPauseStart: (syncMode || viewMode) ? () => {
        // Immediately stop interpolation on pause
        if (isInterpolatingRef.current) {
          isInterpolatingRef.current = false;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
        lastPollIsPlayingRef.current = false;
      } : undefined,
      onSuccess: (syncMode || viewMode) ? (state: any) => {
        // Update state from fresh playback state fetch
        if (state) {
          lastPollIsPlayingRef.current = !!state.is_playing;
          if (state.is_playing) {
            optimisticPlayUntilRef.current = 0;
          }
          if (typeof state.progress_ms === 'number') {
            lastSampleMsRef.current = state.progress_ms;
            lastSampleAtRef.current = performance.now();
            setCurrentInterpolatedMs(state.progress_ms);
          }
        }
      } : undefined,
    }
  );

  // Wrap core toggle with interpolation-specific error handling
  const togglePlayback = useCallback(async () => {
    try {
      await coreToggle();
    } catch (err: any) {

    }
  }, [coreToggle]);

  // Seek to a specific position in milliseconds
  const seekTo = useCallback(async (position_ms: number) => {
    try {
      await spotify.seek(position_ms, deviceId || undefined);
      // Immediately update interpolation baseline
      lastSampleMsRef.current = position_ms;
      lastSampleAtRef.current = performance.now();
      setCurrentInterpolatedMs(position_ms);
    } catch (err: any) {
      console.error('Seek failed:', err);
    }
  }, [spotify, deviceId]);

  return {
    isPlaying,
    currentPosition,
    currentPositionMs: (() => {
      if (needsInterpolation && currentInterpolatedMs != null) {
        return Math.floor(currentInterpolatedMs);
      }
      if (globalTrackId === trackId && globalPosition !== null) return globalPosition * 1000;
      if (webLastTrack === trackId && webLastPosition !== null) return webLastPosition * 1000;
      return currentPosition * 1000;
    })(),
    togglePlayback,
    seekTo,
  };
}