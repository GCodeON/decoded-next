'use client';
import { useRef, useEffect, useMemo } from 'react';
import { useLyricSync } from '@/modules/lyrics/hooks/useLyricSync';
import { useRhymeColorMap } from '@/modules/lyrics/hooks/useRhymeColorMap';
import { parseEnhancedLrc } from '@/modules/lyrics/utils/lrcAdvanced';
import { RhymeWordHighlight } from './RhymeWordHighlight';
import { PlainWordHighlight } from './PlainWordHighlight';
import { SCROLL_OPTIONS } from '@/modules/lyrics/config/sync-constants';
import type { SyncedLyricsProps } from '@/modules/lyrics/types/rhyme';

interface SyncedLyricsWithActiveLine extends SyncedLyricsProps {
  onActiveLineChange?: (line: number) => void;
}

const SyncedLyrics = ({
  syncedLyrics,
  currentPositionMs,
  isPlaying,
  rhymeEncodedLines,
  showRhymes = true,
  mode = 'auto',
  onActiveLineChange
}: SyncedLyricsWithActiveLine) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPositionSec = currentPositionMs / 1000;

  // Parse enhanced LRC to extract word timings
  const { lines, wordsByLine } = useMemo(() => {
    const parsed = parseEnhancedLrc(syncedLyrics);
    const extractedLines = parsed.lines.map((l) => l.text);
    const extractedWords = parsed.lines.map((l) => l.words);
    return { lines: extractedLines, wordsByLine: extractedWords };
  }, [syncedLyrics]);

  // Use useLyricSync for line-level sync with smart hysteresis
  const { activeLine: activeLineIndex } = useLyricSync({
    plainLyrics: lines.join('\n'),
    existingLrc: syncedLyrics,
    currentPosition: currentPositionSec,
    currentPositionMs,
    isPlaying,
    autoScroll: true,
  });

  const isWordSynced = wordsByLine.some((line) => line.length > 0);
  const shouldUseWordSync = mode === 'word' || (mode === 'auto' && isWordSynced);
  
  const { colorMap: rhymeColorMap, wordPartsByLine } = useRhymeColorMap(
    rhymeEncodedLines,
    lines,
    wordsByLine
  );

  // Lead time applied only when both word sync and rhymes are enabled (keeps bg + line in sync)
  const leadAdjustedTime = shouldUseWordSync && showRhymes ? currentPositionSec + 0.5 : currentPositionSec;

  // Helper to calculate filled words for any line based on current time
  const getFilledWordsForLine = (lineWords: typeof wordsByLine[number]) => {
    if (lineWords.length === 0) return 0;
    // Apply lead time when both word sync and rhymes are enabled for snappier animations
    const idx = lineWords.findIndex((w) => w.time > leadAdjustedTime);
    return idx === -1 ? lineWords.length : idx;
  };

  // Predict active line based on word timing for instant visual feedback
  // Use this whenever word timing is available (word sync or rhyme display with word data)
  const hasWordTiming = wordsByLine.length > 0 && wordsByLine.some((line) => line.length > 0);
  
  const predictedActiveLineIndex = useMemo(() => {
    if (!hasWordTiming) return activeLineIndex;
    
    // Find which line the playback is currently in by checking first word times
    for (let i = 0; i < wordsByLine.length; i++) {
      const lineWords = wordsByLine[i];
      if (lineWords.length === 0) continue;
      
      // If current time is before this line's first word, active line is previous
      if (lineWords[0].time > leadAdjustedTime) {
        return i > 0 ? i - 1 : 0;
      }
    }
    
    // We're past all lines
    return wordsByLine.length > 0 ? wordsByLine.length - 1 : activeLineIndex;
  }, [wordsByLine, leadAdjustedTime, hasWordTiming, activeLineIndex]);

  const effectiveActiveLineIndex = hasWordTiming ? predictedActiveLineIndex : activeLineIndex;

  // Call onActiveLineChange when the active line changes
  useEffect(() => {
    if (typeof effectiveActiveLineIndex === 'number' && onActiveLineChange) {
      onActiveLineChange(effectiveActiveLineIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveActiveLineIndex]);

  // Auto-scroll to active line
  useEffect(() => {
    if (effectiveActiveLineIndex === null || !containerRef.current) return;
    const el = containerRef.current.children[effectiveActiveLineIndex] as HTMLElement;
    el?.scrollIntoView(SCROLL_OPTIONS);
  }, [effectiveActiveLineIndex]);

  return (
    <div
      ref={containerRef}
      className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-zinc-900 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
    >
      {lines.map((line, i) => {
        const text = line.trim();
        const isActive = i === effectiveActiveLineIndex;
        const isPast = effectiveActiveLineIndex !== null && i < effectiveActiveLineIndex;
        const words = wordsByLine[i] || [];

        // Empty line (instrumental break)
        if (!text) {
          return (
            <div
              key={i}
              className={`synced-line px-6 py-3 text-center text-gray-500 italic text-md ${
                isActive ? 'opacity-100' : isPast ? 'opacity-70' : 'opacity-40'
              }`}
            >
              (instrumental)
            </div>
          );
        }

        return (
          <div
            key={i}
            className={`px-6 py-3 rounded-lg transition-all ${
              isActive
                ? 'bg-blue-100/70 dark:bg-blue-900/40'
                : isPast
                ? 'opacity-80'
                : 'opacity-50'
            }`}
          >
            {shouldUseWordSync && words.length > 0 && showRhymes ? (
              <RhymeWordHighlight
                words={words}
                rhymeColorMap={rhymeColorMap}
                isActive={isActive}
                isPast={isPast}
                filledWords={getFilledWordsForLine(words)}
                currentTimeSec={currentPositionSec}
                wordParts={wordPartsByLine[i]}
              />
            ) : shouldUseWordSync && words.length > 0 ? (
              <PlainWordHighlight
                lineText={text}
                isActive={isActive}
                filledWords={getFilledWordsForLine(words)}
              />
            ) : showRhymes ? (
              <div dangerouslySetInnerHTML={{ __html: rhymeEncodedLines?.[i] || '' }} />
            ) : (
              <span>{text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SyncedLyrics;