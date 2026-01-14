'use client'
import { useState, useMemo, useRef, useEffect } from 'react';
import { parseLrcForEditing } from '@/modules/lyrics';

interface UseLyricSyncOptions {
  plainLyrics: string;
  existingLrc?: string | null;
  currentPosition: number;
  currentPositionMs?: number;
  isPlaying: boolean;
  autoScroll?: boolean;
}

export function useLyricSync({
  plainLyrics,
  existingLrc,
  currentPosition,
  currentPositionMs,
  isPlaying,
  autoScroll = true
}: UseLyricSyncOptions) {

  const { lines, initialTimestamps } = useMemo(() => {
    if (existingLrc?.trim()) {
      const lrcEntries = parseLrcForEditing(existingLrc);
      return {
        lines: lrcEntries.map(e => e.text),
        initialTimestamps: lrcEntries.map(e => e.time)
      };
    }

    const plainLines = plainLyrics
      .split(/\r?\n/)
      .map(l => l.trim());
    return {
      lines: plainLines,
      initialTimestamps: new Array(plainLines.length).fill(null)
    };
  }, [existingLrc, plainLyrics]);

  const [timestamps, setTimestamps] = useState<(number | null)[]>(initialTimestamps);
  const allStamped = useMemo(() => timestamps.every(t => t !== null), [timestamps]);

  const lastStableRef = useRef<number | null>(null);
  const lastChangeAtRef = useRef<number>(performance.now());
  const lastPosMsRef = useRef<number>(currentPositionMs ?? currentPosition * 1000);
  const playResumeUntilRef = useRef<number>(0);
  const wasPausedRef = useRef<boolean>(!isPlaying);

  const FORWARD_MARGIN_MS = -2000;
  const BACKWARD_MARGIN_MS = 1000;
  const MIN_DWELL_MS = 120;
  const SEEK_JUMP_THRESHOLD_MS = 800;
  const SMALL_REVERSE_IGNORE_MS = 550;

  const lineStartsMs = useMemo(() => timestamps.map(t => t == null ? null : Math.floor(t * 1000)), [timestamps]);

  useEffect(() => {
    if (!isPlaying) {
      wasPausedRef.current = true;
    }
  }, [isPlaying]);

  const activeLine = useMemo(() => {
    if (!isPlaying || !autoScroll) {
      return null;
    }
    
    const posMs = currentPositionMs ?? currentPosition * 1000;
    const prevPos = lastPosMsRef.current;
    const delta = posMs - prevPos;
    lastPosMsRef.current = posMs;
    const now = performance.now();
    
    if (wasPausedRef.current) {
      playResumeUntilRef.current = now + 1200;
      wasPausedRef.current = false;
    }
    
    const inResumeGrace = now < playResumeUntilRef.current;
    const isSeek = !inResumeGrace && Math.abs(delta) > SEEK_JUMP_THRESHOLD_MS;

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
      if (posMs >= start) idx = i;
    }
    
    if (idx === null) {
      return null;
    }

    const lastStable = lastStableRef.current;
    if (lastStable === null) {
      lastStableRef.current = idx;
      lastChangeAtRef.current = now;
      return idx;
    }

    if (idx === lastStable) {
      return lastStable;
    }

    const dwellElapsed = now - lastChangeAtRef.current;


    if (idx > lastStable) {
      const targetStart = lineStartsMs[idx] ?? 0;
      const passedMargin = posMs >= targetStart + (inResumeGrace ? 0 : FORWARD_MARGIN_MS);
      const dwellOk = dwellElapsed >= (inResumeGrace ? 0 : MIN_DWELL_MS);

      const gap = idx - lastStable;
      const normalForwardAllowed = isSeek || (passedMargin && dwellOk);

      if (!isSeek && inResumeGrace && gap > 1) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
        return idx;
      }

      if (normalForwardAllowed) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
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
        return idx;
      }
      if (passedBackward && !smallReverse) {
        lastStableRef.current = idx;
        lastChangeAtRef.current = now;
        return idx;
      }
      return lastStable;
    }
    
    return lastStable;
  }, [currentPosition, currentPositionMs, isPlaying, autoScroll, timestamps, lineStartsMs]);

  return {
    lines,
    timestamps,
    setTimestamps,
    allStamped,
    activeLine
  };
}
