'use client';
import { useRef, useEffect, useMemo } from 'react';
import { useLyricSync } from '@/modules/lyrics/hooks/useLyricSync';
import { useRhymeColorMap } from '@/modules/lyrics/hooks/useRhymeColorMap';
import { parseEnhancedLrc } from '@/modules/lyrics/utils/lrcAdvanced';
import { RhymeWordHighlight } from './RhymeWordHighlight';
import { PlainWordHighlight } from './PlainWordHighlight';
import { useTapHandler } from '@/hooks/useTapHandler';
import type { SyncedLyricsProps } from '@/modules/lyrics/types/rhyme';

interface SyncedLyricsWithActiveLine extends SyncedLyricsProps {
  onActiveLineChange?: (line: number) => void;
  onLineClick?: (timeMs: number) => void;
  containerId?: string;
}

const SyncedLyrics = ({
  syncedLyrics,
  currentPositionMs,
  isPlaying,
  rhymeEncodedLines,
  showRhymes = true,
  mode = 'auto',
  onActiveLineChange,
  onLineClick,
  containerId = 'synced-lyrics-container',
}: SyncedLyricsWithActiveLine) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPositionSec = currentPositionMs / 1000;

  const { lines, wordsByLine } = useMemo(() => {
    const parsed = parseEnhancedLrc(syncedLyrics);
    const extractedLines = parsed.lines.map((l) => l.text);
    const extractedWords = parsed.lines.map((l) => l.words);
    return { lines: extractedLines, wordsByLine: extractedWords };
  }, [syncedLyrics]);

  const { activeLine: activeLineIndex } = useLyricSync({
    plainLyrics: lines.join('\n'),
    existingLrc: syncedLyrics,
    currentPosition: currentPositionSec,
    currentPositionMs,
    isPlaying,
    autoScroll: false,
  });

  const isWordSynced = wordsByLine.some((line) => line.length > 0);
  const shouldUseWordSync = mode === 'word' || (mode === 'auto' && isWordSynced);
  
  const { colorMap: rhymeColorMap, wordPartsByLine } = useRhymeColorMap(
    rhymeEncodedLines,
    lines,
    wordsByLine
  );

  const leadAdjustedTime = shouldUseWordSync && showRhymes ? currentPositionSec + 0.25 : currentPositionSec;

  const getFilledWordsForLine = (lineWords: typeof wordsByLine[number]) => {
    if (lineWords.length === 0) return 0;
    const idx = lineWords.findIndex((w) => w.time > leadAdjustedTime);
    return idx === -1 ? lineWords.length : idx;
  };

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
    
    return wordsByLine.length > 0 ? wordsByLine.length - 1 : activeLineIndex;
  }, [wordsByLine, leadAdjustedTime, hasWordTiming, activeLineIndex]);

  const effectiveActiveLineIndex = hasWordTiming ? predictedActiveLineIndex : activeLineIndex;

  useEffect(() => {
    if (typeof effectiveActiveLineIndex === 'number' && onActiveLineChange) {
      onActiveLineChange(effectiveActiveLineIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveActiveLineIndex]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      className="bg-zinc-900 rounded-xl py-5 md:space-y-2"
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

        const tapHandlers = useTapHandler({
          onTap: () => {
            if (onLineClick && words.length > 0) {
              // Click/tap seeks to first word time
              onLineClick(Math.floor(words[0].time * 1000));
            }
          },
          preventDefault: false
        });

        return (
          <div
            key={i}
            {...tapHandlers}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 md:px-6 py-3 rounded-lg transition-all ${
              isActive
                ? ''
                : isPast
                ? 'opacity-80'
                : 'opacity-40'
            } ${onLineClick ? 'cursor-pointer hover:bg-blue-800/20 active:bg-blue-700/30' : ''}`}
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