"use client";

import { useEffect, useRef, useState } from 'react';
import Liricle from 'liricle';
import type { Word } from '@/modules/lyrics/utils/lrcAdvanced';

const SPOTIFY_OFFSET_MS = 0;

export interface LiricleSyncResult {
  activeLine: number | null;
  activeWordIndex: number | null;
  isPlaying: boolean;
  lines: string[];
  wordsByLine: Word[][];
  error: string | null;
  currentTimeSec: number; // Offset-adjusted playback time for consistent word/line sync
}

export function useLiricleSync({
  lrcText,
  currentPositionMs,
  isPlaying,
}: {
  lrcText: string;
  currentPositionMs: number;
  isPlaying: boolean;
}): LiricleSyncResult {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [wordsByLine, setWordsByLine] = useState<Word[][]>([]);
  const [error, setError] = useState<string | null>(null);

  const instanceRef = useRef<Liricle | null>(null);

  // Initialize Liricle instance once per LRC text
  useEffect(() => {
    if (!lrcText) {
      instanceRef.current = null;
      setLines([]);
      setWordsByLine([]);
      setActiveLine(null);
      setActiveWordIndex(null);
      setError(null);
      return;
    }

    let isMounted = true;

    try {
      const newInstance = new Liricle();
      instanceRef.current = newInstance;

      const onLoad = (data: any) => {
        if (!isMounted) return;
        setLines(data.lines.map((l: any) => l.text || ''));
        setWordsByLine(data.lines.map((l: any) => l.words || []));
        setError(null);
      };

      const onLoadError = (err: any) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to parse lyrics');
      };

      const onSync = (line: any, word: any) => {
        if (!isMounted) return;
        setActiveLine(line?.index ?? null);
        setActiveWordIndex(word?.index ?? null);
      };

      newInstance.on('load', onLoad);
      newInstance.on('loaderror', onLoadError);
      newInstance.on('sync', onSync);

      newInstance.load({ text: lrcText });
      // Fine-tune sync for Spotify (~150ms offset)
      newInstance.offset = SPOTIFY_OFFSET_MS;

      return () => {
        isMounted = false;
        instanceRef.current = null;
      };
    } catch (err) {
      if (isMounted) {
        setError((err as Error).message);
      }
      return () => {
        isMounted = false;
        instanceRef.current = null;
      };
    }
  }, [lrcText]);

  // Sync playback position
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !isPlaying) return;

    const currentSec = currentPositionMs / 1000;
    instance.sync(currentSec);
  }, [currentPositionMs, isPlaying]);

  // Compute offset-adjusted time for word progress calculations
  const currentTimeSec = (currentPositionMs - SPOTIFY_OFFSET_MS) / 1000;

  return {
    activeLine,
    activeWordIndex,
    isPlaying,
    lines,
    wordsByLine,
    error,
    currentTimeSec,
  };
}