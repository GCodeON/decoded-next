'use client';
import { useRef, useEffect } from 'react';
import { useLiricleSync } from '@/modules/lyrics/hooks/useLiricleSync';
import { useRhymeColorMap } from '@/modules/lyrics/hooks/useRhymeColorMap';
import { RhymeWordHighlight } from './RhymeWordHighlight';
import { PlainWordHighlight } from './PlainWordHighlight';
import { SCROLL_OPTIONS } from '@/modules/lyrics/config/sync-constants';
import type { SyncedLyricsProps } from '@/modules/lyrics/types/rhyme';

const SyncedLyrics = ({
  syncedLyrics,
  currentPositionMs,
  isPlaying,
  rhymeEncodedLines,
  showRhymes = true,
  mode = 'auto',
  animationStyle = 'scale',
}: SyncedLyricsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { activeLine: activeLineIndex, lines, wordsByLine, error } = useLiricleSync({
    lrcText: syncedLyrics,
    currentPositionMs,
    isPlaying,
  });

  const currentTimeSec = currentPositionMs / 1000;
  const isWordSynced = wordsByLine.some((line) => line.length > 0);
  const shouldUseWordSync = mode === 'word' || (mode === 'auto' && isWordSynced);
  
  const { colorMap: rhymeColorMap, wordPartsByLine } = useRhymeColorMap(
    rhymeEncodedLines,
    lines,
    wordsByLine
  );

  // Calculate filled words in active line
  const filledWords =
    activeLineIndex !== null
      ? (() => {
          const words = wordsByLine[activeLineIndex] || [];
          const idx = words.findIndex((w) => currentTimeSec < w.time);
          return idx === -1 ? words.length : idx;
        })()
      : 0;

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineIndex === null || !containerRef.current) return;
    const el = containerRef.current.children[activeLineIndex] as HTMLElement;
    el?.scrollIntoView(SCROLL_OPTIONS);
  }, [activeLineIndex]);

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <div
      ref={containerRef}
      className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-zinc-900 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
    >
      {lines.map((line, i) => {
        const text = line.trim();
        const isActive = i === activeLineIndex;
        const isPast = activeLineIndex !== null && i < activeLineIndex;
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
            className={`px-6 py-3 rounded-lg transition-all duration-300 ${
              isActive
                ? 'bg-blue-100/70 dark:bg-blue-900/40 font-bold'
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
                filledWords={isActive ? filledWords : 0}
                animationStyle={animationStyle}
                currentTimeSec={currentTimeSec}
                wordParts={wordPartsByLine[i]}
              />
            ) : shouldUseWordSync && words.length > 0 ? (
              <PlainWordHighlight
                lineText={text}
                isActive={isActive}
                filledWords={filledWords}
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