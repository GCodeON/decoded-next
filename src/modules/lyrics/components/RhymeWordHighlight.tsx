'use client';
import { useRef, memo } from 'react';
import type { Word } from '../utils/lrcAdvanced';
import type { WordRhymeParts } from '../types/rhyme';
import { useWordProgress } from '../hooks/useWordProgress';
import { WORD_STYLE, SEGMENT_STYLE } from '../config/sync-constants';

interface RhymeWordHighlightProps {
  words: Word[];
  rhymeColorMap: Map<string, string>;
  isActive: boolean;
  isPast: boolean;
  filledWords: number;
  currentTimeSec: number;
  wordParts?: WordRhymeParts[];
}

export const RhymeWordHighlight = memo(function RhymeWordHighlight({
  words,
  rhymeColorMap,
  isActive,
  isPast,
  filledWords,
  currentTimeSec,
  wordParts,
}: RhymeWordHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const getWordProgress = useWordProgress(words, currentTimeSec, isPast, filledWords);

  return (
    <>
      <div ref={containerRef} className="relative inline-block leading-relaxed">
        {words.map((word, index) => {
          const clean = word.text.toLowerCase().replace(/[^\w']/g, '');
          const fallbackColor = rhymeColorMap.get(clean) || undefined;
          const progress = getWordProgress(index);

          const segments =
            wordParts && wordParts[index] && wordParts[index].length > 0
              ? wordParts[index]
              : [
                  {
                    text: word.text,
                    color: fallbackColor || null,
                    start: 0,
                    end: word.text.length,
                  },
                ];

          // Always add space between words (except last word) for proper spacing
          const segmentsWithSpace =
            index < words.length - 1
              ? [...segments, { text: ' ', color: null, start: -1, end: -1 }]
              : segments;

          const totalChars = segmentsWithSpace.reduce((sum, seg) => sum + (seg.end - seg.start > 0 ? seg.end - seg.start : seg.text.length), 0) || 1;
          const revealChars = Math.round(totalChars * progress);

          let remaining = revealChars;

          return (
            <span key={index} data-word={index} style={WORD_STYLE}>
              {segmentsWithSpace.map((seg, segIdx) => {
                const segLength = seg.end - seg.start > 0 ? seg.end - seg.start : seg.text.length;
                const visibleCount = Math.min(Math.max(remaining, 0), segLength);
                remaining = Math.max(remaining - segLength, 0);

                const visibleText = seg.text.slice(0, visibleCount);
                const hiddenText = seg.text.slice(visibleCount);
                const segColor = seg.color || fallbackColor;

                return (
                  <span key={`${index}-${segIdx}`} className="inline-block">
                    {visibleText && (
                      <span
                        style={{
                          backgroundColor: segColor || 'transparent',
                          ...SEGMENT_STYLE,
                        }}
                      >
                        {visibleText}
                      </span>
                    )}
                    {hiddenText && <span>{hiddenText}</span>}
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
    </>
  );
});
