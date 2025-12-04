'use client'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSpotifyApi, useSyncPolling } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';

// Enable logs via param or env var NEXT_PUBLIC_DEBUG_SYNC=1
const ENV_DEBUG_SYNC = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEBUG_SYNC === true.toString();

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

  // Latest play state observed from poll
  const lastPollIsPlayingRef = useRef<boolean | null>(null);
  // Short-lived optimistic play window to reflect UI immediately after toggle
  const optimisticPlayUntilRef = useRef<number>(0);

  // Baseline sample from last poll
  const lastSampleMsRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef<number>(performance.now());
  const lastLoggedSecondRef = useRef<number | null>(null);
  // Interpolated ms state updated each frame
  const [currentInterpolatedMs, setCurrentInterpolatedMs] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  // Ref to avoid triggering re-renders in tick
  const currentInterpolatedMsRef = useRef<number | null>(null);
  useEffect(() => {
    currentInterpolatedMsRef.current = currentInterpolatedMs;
  }, [currentInterpolatedMs]);
  const isInterpolatingRef = useRef(false);

  // Derive playing state from global context
  const isPlaying = useMemo(() => {
    if (!enabled) return false;
    // Prefer latest poll-observed play state when in sync/view modes
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

  // Track global position for seek detection
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
          if (debug) console.log('[PlaybackSync] seek detected from global', { 
            trackId, 
            from: currentBaseline, 
            to: globalMs, 
            drift: driftFromBaseline 
          });
          lastSampleMsRef.current = globalMs;
          lastSampleAtRef.current = performance.now();
        }
      }
      
      lastGlobalPositionRef.current = globalMs;
    }
  }, [needsInterpolation, globalTrackId, trackId, globalPosition, debug]);

  useEffect(() => {
    if (needsInterpolation && lastSampleMsRef.current == null) {

      if (globalTrackId === trackId && globalPosition !== null) {
        lastSampleMsRef.current = globalPosition * 1000;
        lastSampleAtRef.current = performance.now();
        lastGlobalPositionRef.current = globalPosition * 1000;
        if (debug) console.log('[PlaybackSync] initialized from global', { trackId, posMs: lastSampleMsRef.current });
      }
    }
  }, [needsInterpolation, globalTrackId, trackId, globalPosition, debug]);

  // rAF loop: compute interpolated ms from baseline + elapsed each frame
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
      if (debug && lastLoggedSecondRef.current !== sec) {
        lastLoggedSecondRef.current = sec;
        const elapsed = performance.now() - lastSampleAtRef.current;
        console.log('[PlaybackSync] using interpolated', { trackId, sec, ms: Math.floor(currentInterpolatedMs), ageMs: Math.floor(elapsed) });
      }
      return sec;
    }
    // Fallback chain
    if (globalTrackId === trackId && globalPosition !== null) {
      if (debug && lastLoggedSecondRef.current !== globalPosition) {
        lastLoggedSecondRef.current = globalPosition;
        console.log('[PlaybackSync] using global', { trackId, pos: globalPosition });
      }
      return globalPosition;
    }
    if (webLastTrack === trackId && webLastPosition !== null) {
      if (debug && lastLoggedSecondRef.current !== webLastPosition) {
        lastLoggedSecondRef.current = webLastPosition;
        console.log('[PlaybackSync] using web', { trackId, pos: webLastPosition });
      }
      return webLastPosition;
    }
    if (debug && lastLoggedSecondRef.current !== 0) {
      lastLoggedSecondRef.current = 0;
      console.log('[PlaybackSync] using default', { trackId, pos: 0 });
    }
    return 0;
  }, [needsInterpolation, currentInterpolatedMs, debug, trackId, globalTrackId, globalPosition, webLastTrack, webLastPosition]);

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
            if (debug) console.log('[PlaybackSync] seek detected', { trackId, from: prev, to: newMs, diff });
            lastSampleMsRef.current = newMs;
            lastSampleAtRef.current = now;
          } else if (newMs <= currentInterpolatedValue) {
            // Poll sample is at or behind interpolation - reject to prevent any backwards movement
            if (debug && newMs < currentInterpolatedValue - 50) {
              console.log('[PlaybackSync] stale poll ignored', { trackId, interpolated: Math.floor(currentInterpolatedValue), poll: newMs, diff: newMs - currentInterpolatedValue });
            }
            return;
          } else {
            // Sample is ahead of interpolation - use it
            lastSampleMsRef.current = newMs;
            lastSampleAtRef.current = now;
            if (diff > 5000 && debug) {
              console.log('[PlaybackSync] large forward jump', { trackId, from: prev, to: newMs, diff });
            }
          }
        } else {
          if (prev != null) {
            const diff = newMs - prev;
            if (diff < -2000) {
              if (debug) console.log('[PlaybackSync] seek detected', { trackId, from: prev, to: newMs, diff });
            } else if (diff < -150) {

              if (debug) console.log('[PlaybackSync] stale sample ignored', { trackId, prev, sample: newMs, diff });
              return;
            }
            if (diff > 5000 && debug) {
              console.log('[PlaybackSync] large forward jump', { trackId, from: prev, to: newMs, diff });
            }
          }
          lastSampleMsRef.current = newMs;
          lastSampleAtRef.current = now;
        }
        
        if (shouldInterpolate && !isInterpolatingRef.current) {
          isInterpolatingRef.current = true;
          rafRef.current = requestAnimationFrame(tickStable);
          if (debug) console.log('[PlaybackSync] interpolation started from poll', { trackId, posMs: newMs, isPlaying: isPlayingNow, optimistic: inOptimisticWindow });
        }
        
        // Stop interpolation immediately if paused
        if (!isPlayingNow && !inOptimisticWindow && isInterpolatingRef.current) {
          isInterpolatingRef.current = false;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          if (debug) console.log('[PlaybackSync] interpolation stopped - paused', { trackId });
        }
        
        if (debug) console.log('[PlaybackSync] poll update', { trackId, sec: Math.floor(newMs / 1000), progressMs: newMs, isPlaying: isPlayingNow, effectiveIsPlaying, optimistic: inOptimisticWindow });
      }
    } catch (err) {
      // Silent ignore; global polling handles auth
    }
  }, [spotify, trackId, debug, syncMode, viewMode]);
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
    intervalMs: (syncMode || viewMode) ? 150 : 200
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
          // Immediately stop interpolation on pause
          if (isInterpolatingRef.current) {
            isInterpolatingRef.current = false;
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
          }
          lastPollIsPlayingRef.current = false;
        } else {
          const positionMs = (() => {
            if (typeof (currentInterpolatedMs) === 'number') return Math.floor(currentInterpolatedMs);
            if (typeof (lastSampleMsRef.current) === 'number') return Math.floor(lastSampleMsRef.current!);
            if (globalTrackId === trackId && globalPosition !== null) return Math.floor(globalPosition * 1000);
            return Math.floor(currentPosition * 1000);
          })();
          
          // Optimistically start interpolation BEFORE API call for instant UI response
          if (syncMode || viewMode) {
            lastPollIsPlayingRef.current = true;
            optimisticPlayUntilRef.current = performance.now() + 2000; // 2s optimistic window
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
              if (debug) console.log('[PlaybackSync] interpolation started optimistically BEFORE API call', { trackId, posMs: positionMs });
            }
          }
          
          await spotify.play(targetDeviceId || undefined, [`spotify:track:${trackId}`], positionMs);
          
          // Trigger immediate fetch to get fresh position after play
          if (syncMode || viewMode) {
            try {
              const s = await spotify.getPlaybackState();
              if (s) {
                lastPollIsPlayingRef.current = !!s.is_playing;
                // Clear optimistic window only if service reports playing
                if (s.is_playing) {
                  optimisticPlayUntilRef.current = 0;
                } else if (debug) {
                  console.log('[PlaybackSync] keeping optimistic window (poll says paused right after play)', { trackId });
                }
                if (typeof s.progress_ms === 'number') {
                  lastSampleMsRef.current = s.progress_ms;
                  lastSampleAtRef.current = performance.now();
                  // Immediately update interpolated value so UI jumps to correct position on resume
                  setCurrentInterpolatedMs(s.progress_ms);
                  if (debug) console.log('[PlaybackSync] fresh position after play', { trackId, posMs: s.progress_ms });
                }
              }
            } catch {}
          }
        }
      } catch (err: any) {
        // If 404 or "no active device", transfer and retry
        const msg = String(err?.message || '');
        if (err?.response?.status === 404 || msg.includes('device') || msg.includes('404')) {
          if (targetDeviceId) {
            await spotify.transferPlayback(targetDeviceId, true);
            // Retry play
            const positionMs = (() => {
              if (typeof (currentInterpolatedMs) === 'number') return Math.floor(currentInterpolatedMs);
              if (typeof (lastSampleMsRef.current) === 'number') return Math.floor(lastSampleMsRef.current!);
              if (globalTrackId === trackId && globalPosition !== null) return Math.floor(globalPosition * 1000);
              return Math.floor(currentPosition * 1000);
            })();

            if (syncMode || viewMode) {
              lastPollIsPlayingRef.current = true;
              optimisticPlayUntilRef.current = performance.now() + 2000;
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
                if (debug) console.log('[PlaybackSync] interpolation started optimistically BEFORE transfer+play', { trackId, posMs: positionMs });
              }
            }
            
            await spotify.play(targetDeviceId, [`spotify:track:${trackId}`], positionMs);
            
            // Immediate fetch after transfer
            if (syncMode || viewMode) {
              try {
                const s = await spotify.getPlaybackState();
                if (s) {
                  lastPollIsPlayingRef.current = !!s.is_playing;
                  if (s.is_playing) {
                    optimisticPlayUntilRef.current = 0;
                  } else if (debug) {
                    console.log('[PlaybackSync] keeping optimistic window after transfer (poll says paused)', { trackId });
                  }
                  if (typeof s.progress_ms === 'number') {
                    lastSampleMsRef.current = s.progress_ms;
                    lastSampleAtRef.current = performance.now();
                    setCurrentInterpolatedMs(s.progress_ms);
                    if (debug) console.log('[PlaybackSync] fresh position after transfer', { trackId, posMs: s.progress_ms });
                  }
                }
              } catch {}
            }
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
    currentPositionMs: (() => {
      if (needsInterpolation && currentInterpolatedMs != null) {
        return Math.floor(currentInterpolatedMs);
      }
      if (globalTrackId === trackId && globalPosition !== null) return globalPosition * 1000;
      if (webLastTrack === trackId && webLastPosition !== null) return webLastPosition * 1000;
      return currentPosition * 1000;
    })(),
    togglePlayback,
  };
}