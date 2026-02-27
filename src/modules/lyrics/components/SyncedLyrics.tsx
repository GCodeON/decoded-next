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
  youtubeUrl?: string;
  onYoutubeUrlChange?: (value: string) => void;
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
  youtubeUrl = '',
  onYoutubeUrlChange,
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

    let low = 0;
    let high = lineWords.length;

    while (low < high) {
      const mid = low + Math.floor((high - low) / 2);
      if (lineWords[mid].time <= leadAdjustedTime) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  };

  const hasWordTiming = wordsByLine.length > 0 && wordsByLine.some((line) => line.length > 0);

  const normalizedYoutubeUrl = youtubeUrl.trim();
  const youtubeHref = useMemo(() => {
    if (!normalizedYoutubeUrl) return null;

    try {
      const parsedUrl = new URL(normalizedYoutubeUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const isYoutubeHost =
        hostname === 'youtube.com' ||
        hostname === 'www.youtube.com' ||
        hostname === 'm.youtube.com' ||
        hostname === 'youtu.be' ||
        hostname === 'www.youtu.be';

      return isYoutubeHost ? parsedUrl.toString() : null;
    } catch {
      return null;
    }
  }, [normalizedYoutubeUrl]);

  const timedLineStarts = useMemo(() => {
    const lineIndices: number[] = [];
    const startTimes: number[] = [];

    for (let i = 0; i < wordsByLine.length; i++) {
      const lineWords = wordsByLine[i];
      if (lineWords.length === 0) continue;

      const firstWordTime = lineWords[0]?.time;
      if (typeof firstWordTime !== 'number') continue;

      lineIndices.push(i);
      startTimes.push(firstWordTime);
    }

    return { lineIndices, startTimes };
  }, [wordsByLine]);
  
  const predictedActiveLineIndex = useMemo(() => {
    if (!playbackActive) return null;
    if (!hasWordTiming) return activeLineIndex;

    const { lineIndices, startTimes } = timedLineStarts;
    if (startTimes.length === 0) {
      return activeLineIndex;
    }

    let low = 0;
    let high = startTimes.length;
    while (low < high) {
      const mid = low + Math.floor((high - low) / 2);
      if (startTimes[mid] > leadAdjustedTime) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    if (low < lineIndices.length) {
      const currentTimedLineIndex = lineIndices[low];
      return currentTimedLineIndex > 0 ? currentTimedLineIndex - 1 : 0;
    }
    
    return wordsByLine.length > 0 ? wordsByLine.length - 1 : activeLineIndex;
  }, [timedLineStarts, wordsByLine.length, leadAdjustedTime, hasWordTiming, activeLineIndex, playbackActive]);

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
        <div className="flex flex-wrap items-center gap-3 px-5 md:px-6">
          <div className="flex items-center gap-2">
            <label htmlFor="lead-adjust" className="text-sm text-gray-400 whitespace-nowrap">
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
          <div className="flex flex-col items-stretch gap-2 min-w-0 flex-1 md:flex-row md:items-center">
            <label htmlFor="youtube-url" className="text-sm text-gray-400 md:whitespace-nowrap">
              YouTube URL:
            </label>
            <input
              id="youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={(e) => onYoutubeUrlChange?.(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded bg-zinc-800 px-2 py-1 text-white text-sm"
            />
            {youtubeHref && (
              <a
                href={youtubeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-zinc-700 px-2 py-1 text-xs text-white whitespace-nowrap hover:bg-zinc-600 self-start md:self-auto"
              >
                Open
              </a>
            )}
          </div>
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