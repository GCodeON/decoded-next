"use client";

import { useEffect, useRef, useState } from 'react';
import Liricle from 'liricle';
import type { Word } from '@/modules/lyrics/utils/lrcAdvanced';

export interface LiricleSyncResult {
  activeLine: number | null;
  activeWordIndex: number | null;
  isPlaying: boolean;
  lines: string[];
  wordsByLine: Word[][];
  error: string | null;
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

  // Create fresh instance on each LRC change 
  useEffect(() => {
    if (!lrcText) {
      setLines([]);
      setWordsByLine([]);
      setActiveLine(null);
      setActiveWordIndex(null);
      setError(null);
      return;
    }

    let newInstance: Liricle | null = null;
    let isMounted = true; 

    try {
      newInstance = new Liricle();

      const onLoad = (data: any) => {
        if (!isMounted) return;
        console.log('Liricle loaded:', data);
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

      // Load lyrics
      newInstance.load({ text: lrcText });

      // Fine-tune sync for Spotify (~100–200ms offset)
      newInstance.offset = 150;

   
      return () => {
        isMounted = false; // Prevent stale updates
        newInstance = null; // Allow GC
      };
    } catch (err) {
      if (isMounted) {
        setError((err as Error).message);
      }
      return () => {
        isMounted = false;
        newInstance = null;
      };
    }
  }, [lrcText]); 

  useEffect(() => {
  }, [currentPositionMs, isPlaying]); 

  const instanceRef = useRef<Liricle | null>(null);

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
      newInstance.offset = 150;

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

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !isPlaying) return;

    const currentSec = currentPositionMs / 1000;
    instance.sync(currentSec); 
  }, [currentPositionMs, isPlaying]);

  return {
    activeLine,
    activeWordIndex,
    isPlaying,
    lines,
    wordsByLine,
    error,
  };
}