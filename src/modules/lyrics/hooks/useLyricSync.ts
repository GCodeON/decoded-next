'use client'
import { useState, useMemo } from 'react';
import { parseLrcForEditing } from '@/modules/lyrics';

interface UseLyricSyncOptions {
  plainLyrics: string;
  existingLrc?: string | null;
  currentPosition: number;
  isPlaying: boolean;
  autoScroll?: boolean;
}

export function useLyricSync({
  plainLyrics,
  existingLrc,
  currentPosition,
  isPlaying,
  autoScroll = true
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

  // Calculate active line based on playback position
  const activeLine = useMemo(() => {
    if (!isPlaying || !autoScroll) return null;

    const len = timestamps.length;
    const nextNonNull = (idx: number): number | null => {
      for (let j = idx + 1; j < len; j++) {
        if (timestamps[j] !== null) return timestamps[j] as number;
      }
      return null;
    };

    let targetIndex = 0;
    for (let i = 0; i < len; i++) {
      const t = timestamps[i];
      if (t === null) continue;
      
      const nextT = nextNonNull(i);
      if (currentPosition >= t && (nextT === null || currentPosition < nextT)) {
        targetIndex = i;
        break;
      }
      if (currentPosition >= t) {
        targetIndex = i;
      }
    }

    return targetIndex;
  }, [currentPosition, timestamps, isPlaying, autoScroll]);

  return {
    lines,
    timestamps,
    setTimestamps,
    allStamped,
    activeLine
  };
}
