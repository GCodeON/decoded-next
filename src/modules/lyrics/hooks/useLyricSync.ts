'use client'
import { useState, useMemo, useRef, useEffect } from 'react';
import { parseLrcForEditing } from '@/modules/lyrics';

interface UseLyricSyncOptions {
  plainLyrics: string;
  existingLrc?: string | null;
  currentPosition: number; // seconds
  currentPositionMs?: number; // optional ms precision
  isPlaying: boolean;
  autoScroll?: boolean;
  debug?: boolean;
}

export function useLyricSync({
  plainLyrics,
  existingLrc,
  currentPosition,
  currentPositionMs,
  isPlaying,
  autoScroll = true,
  debug = false
}: UseLyricSyncOptions) {
  // Parse lines and timestamps
  const { lines, initialTimestamps } = useMemo(() => {
    if (existingLrc?.trim()) {
      const lrcEntries = parseLrcForEditing(existingLrc);
      return {
        lines: lrcEntries.map(e => e.text),
        initialTimestamps: lrcEntries.map(e => e.time)
      };
    }
    // PRESERVE EMPTY LINES in plain lyrics to match LRC structure
    const plainLines = plainLyrics
      .split(/\r?\n/)
      .map(l => l.trim()); // Keep empty strings for blank lines
    return {
      lines: plainLines,
      initialTimestamps: new Array(plainLines.length).fill(null)
    };
  }, [existingLrc, plainLyrics]);

  const [timestamps, setTimestamps] = useState<(number | null)[]>(initialTimestamps);
  const allStamped = useMemo(() => timestamps.every(t => t !== null), [timestamps]);

  // Hysteresis & stabilization for active line selection
  const lastStableRef = useRef<number | null>(null);
  const lastChangeAtRef = useRef<number>(performance.now());
  const lastPosMsRef = useRef<number>(currentPositionMs ?? currentPosition * 1000);
  const playResumeUntilRef = useRef<number>(0);
  const wasPausedRef = useRef<boolean>(!isPlaying);

  // Threshold constants (tunable)
  const FORWARD_MARGIN_MS = -2000;
  const BACKWARD_MARGIN_MS = 1000;
  const MIN_DWELL_MS = 120;
  const SEEK_JUMP_THRESHOLD_MS = 800; // treat as seek
  const SMALL_REVERSE_IGNORE_MS = 550; // ignore jitter backwards

  // Precompute timestamp starts (ms)
  const lineStartsMs = useMemo(() => timestamps.map(t => t == null ? null : Math.floor(t * 1000)), [timestamps]);

  // Track pause state via effect
  useEffect(() => {
    if (!isPlaying) {
      wasPausedRef.current = true;
    }
  }, [isPlaying]);

  // Compute activeLine synchronously with useMemo instead of useEffect for zero-frame delay
  const activeLine = useMemo(() => {
    if (!isPlaying || !autoScroll) {
      return null;
    }
    
    const posMs = currentPositionMs ?? currentPosition * 1000;
    const prevPos = lastPosMsRef.current;
    const delta = posMs - prevPos;
    lastPosMsRef.current = posMs;
    const now = performance.now();
    
    // Detect resume: isPlaying && wasPaused -> establish grace period immediately
    if (wasPausedRef.current) {
      playResumeUntilRef.current = now + 1200; // extended grace period
      if (debug) console.log('[LyricSync] ▶️ RESUME', { 
        posMs,
        timestamp: new Date().toISOString(),
        lastStable: lastStableRef.current 
      });
      wasPausedRef.current = false;
    }
    
    const inResumeGrace = now < playResumeUntilRef.current;
    // Treat large delta as seek only if NOT in resume grace period (first computation after resume)
    const isSeek = !inResumeGrace && Math.abs(delta) > SEEK_JUMP_THRESHOLD_MS;

    // Find naive index
    let idx: number | null = null;
    for (let i = 0; i < lineStartsMs.length; i++) {
      const start = lineStartsMs[i];
      if (start == null) continue;
      const nextStart = (() => {
        for (let j = i + 1; j < lineStartsMs.length; j++) {
          if (lineStartsMs[j] != null) return lineStartsMs[j] as number;
        }
        return Number.POSITIVE_INFINITY;
      })();
      if (posMs >= start && posMs < nextStart) {
        idx = i;
        break;
      }
      if (posMs >= start) idx = i; // last passed
    }
    
    if (debug) console.log('[LyricSync] 🔍 computed idx', { 
      idx, 
      posMs, 
      lastStable: lastStableRef.current,
      gap: idx !== null && lastStableRef.current !== null ? idx - lastStableRef.current : null
    });
    
    if (idx === null) {
      return null;
    }

    const lastStable = lastStableRef.current;
    if (lastStable === null) {
      lastStableRef.current = idx;
      lastChangeAtRef.current = now;
      if (debug) console.log('[LyricSync] init', { idx });
      return idx;
    }

    if (idx === lastStable) {
      // no change
      return lastStable;
    }

    const dwellElapsed = now - lastChangeAtRef.current;

    if (debug && inResumeGrace) {
      console.log('[LyricSync] ⏱️ Grace period ACTIVE', {
        remainingMs: Math.round(playResumeUntilRef.current - now),
        posMs
      });
    }

    // Forward move (including resume handling)
    if (idx > lastStable) {
      const targetStart = lineStartsMs[idx] ?? 0;
      const passedMargin = posMs >= targetStart + (inResumeGrace ? 0 : FORWARD_MARGIN_MS);
      const dwellOk = dwellElapsed >= (inResumeGrace ? 0 : MIN_DWELL_MS);

      const gap = idx - lastStable;
      const normalForwardAllowed = isSeek || (passedMargin && dwellOk);

      // If resuming and gap > 1: jump immediately to correct line (audio already playing)
      if (!isSeek && inResumeGrace && gap > 1) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
        if (debug) console.log('[LyricSync] 🎯 RESUME JUMP', {
          from: lastStable,
          to: idx,
          gap,
          posMs
        });
        return idx;
      }

      if (normalForwardAllowed) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
        if (debug) console.log('[LyricSync] ⏭️ FORWARD move', { 
          from: lastStable,
          to: idx, 
          posMs,
          passedMargin,
          dwellOk,
          isSeek
        });
        return idx;
      }
      return lastStable;
    }

    // Backward move
    if (idx < lastStable) {
      const currentStart = lineStartsMs[lastStable] ?? 0;
      const passedBackward = posMs < currentStart - (inResumeGrace ? 0 : BACKWARD_MARGIN_MS);
      const smallReverse = delta < 0 && Math.abs(delta) < SMALL_REVERSE_IGNORE_MS;
      if (isSeek && !smallReverse) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
        if (debug) console.log('[LyricSync] ⏪ SEEK-BACK', { 
          from: lastStable,
          to: idx, 
          posMs 
        });
        return idx;
      }
      if (passedBackward && !smallReverse) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
        if (debug) console.log('[LyricSync] ⏮️ BACKWARD move', { 
          from: lastStable,
          to: idx, 
          posMs 
        });
        return idx;
      }
      // ignore jitter backwards
      return lastStable;
    }
    
    return lastStable;
  }, [currentPosition, currentPositionMs, isPlaying, autoScroll, timestamps, debug, lineStartsMs]);

  return {
    lines,
    timestamps,
    setTimestamps,
    allStamped,
    activeLine
  };
}
