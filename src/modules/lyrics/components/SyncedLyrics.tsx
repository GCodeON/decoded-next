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
  isAdmin?: boolean;
  leadAdjustmentSec?: number;
  onLeadAdjustmentChange?: (value: number) => void;
  showLeadAdjustment?: boolean;
  isTrackActive?: boolean;
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
  isAuthenticated = false,
  isAdmin = false,
  leadAdjustmentSec = 0,
  onLeadAdjustmentChange,
  showLeadAdjustment = true,
  isTrackActive = true,
}: SyncedLyricsWithActiveLine) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playbackActive = isTrackActive === true;
  const currentPositionSec = playbackActive ? currentPositionMs / 1000 : 0;

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
    isPlaying: isPlaying && playbackActive,
    autoScroll: false,
  });

  const isWordSynced = wordsByLine.some((line) => line.length > 0);
  const shouldUseWordSync = mode === 'word' || (mode === 'auto' && isWordSynced);
  
  const { wordPartsByLine } = useRhymeColorMap(
    rhymeEncodedLines,
    lines,
    wordsByLine
  );

  const leadAdjustedTime = currentPositionSec + leadAdjustmentSec;

  const getFilledWordsForLine = (lineWords: typeof wordsByLine[number]) => {
    if (lineWords.length === 0) return 0;
    const idx = lineWords.findIndex((w) => w.time > leadAdjustedTime);
    return idx === -1 ? lineWords.length : idx;
  };

  const hasWordTiming = wordsByLine.length > 0 && wordsByLine.some((line) => line.length > 0);
  
  const predictedActiveLineIndex = useMemo(() => {
    if (!playbackActive) return null;
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
    if (playbackActive && typeof effectiveActiveLineIndex === 'number' && onActiveLineChange) {
      onActiveLineChange(effectiveActiveLineIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveActiveLineIndex, playbackActive]);

  return (
    <div className="space-y-3">
      {isAdmin && showLeadAdjustment && (
        <div className="flex items-center gap-2 px-5 md:px-6">
          <label htmlFor="lead-adjust" className="text-sm text-gray-400">
            Lead Adjustment (ms):
          </label>
          <input
            id="lead-adjust"
            type="number"
            value={Math.round(leadAdjustmentSec * 1000)}
            onChange={(e) => onLeadAdjustmentChange?.(Number(e.target.value) / 1000)}
            step={50}
            className="w-24 rounded bg-zinc-800 px-2 py-1 text-white text-sm"
          />
        </div>
      )}
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
        const filledWords = isPast ? words.length : isActive ? getFilledWordsForLine(words) : 0;
        
        // When rhymes are toggled and user is not authenticated, show full opacity
        const shouldShowFullOpacity = showRhymes && !isAuthenticated;

        // Empty line (instrumental break)
        if (!text) {
          return (
            <div
              key={i}
              className={`synced-line px-6 py-3 text-center text-gray-500 italic text-md ${
                shouldShowFullOpacity
                  ? 'opacity-100'
                  : isActive ? 'opacity-100' : isPast ? 'opacity-70' : 'opacity-60'
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
            className={`px-5 py-0.75 md:px-3 md:px-6 md:py-0.5  rounded-lg transition-all md:text-xl 2xl:text-2xl ${
              shouldShowFullOpacity
                ? 'opacity-100'
                : isActive
                ? ''
                : isPast
                ? 'opacity-80'
                : 'opacity-60'
            } ${onLineClick ? 'cursor-pointer hover:bg-blue-800/20 active:bg-blue-700/30' : ''}`}
          >
            {shouldUseWordSync && words.length > 0 && showRhymes ? (
              <RhymeWordHighlight
                words={words}
                isActive={isActive}
                isPast={isPast}
                filledWords={filledWords}
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
    </div>
  );
};

export default SyncedLyrics;