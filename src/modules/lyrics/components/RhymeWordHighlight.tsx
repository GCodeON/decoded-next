"use client";
import { useMemo, memo } from 'react';
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
  const getWordProgress = useWordProgress(words, currentTimeSec, isPast, filledWords);

  // Precompute per-word segments and totals once per words/wordParts change
  const precomputed = useMemo(() => {
    return words.map((word, index) => {
      const segments =
        wordParts && wordParts[index] && wordParts[index].length > 0
          ? wordParts[index]
          : [
              {
                text: word.text,
                bgColor: null as string | null,
                textColor: null as string | null,
                underline: false,
                start: 0,
                end: word.text.length,
              },
            ];

      // Add a space between words (except last) for proper spacing
      const addSpace = index < words.length - 1;
      const segmentsWithSpace = addSpace
        ? [
            ...segments,
            { text: ' ', bgColor: null, textColor: null, underline: false, start: -1, end: -1 },
          ]
        : segments;

      const totalChars =
        segmentsWithSpace.reduce((sum, seg) => {
          const len = seg.end - seg.start > 0 ? seg.end - seg.start : seg.text.length;
          return sum + len;
        }, 0) || 1;

      return { segmentsWithSpace, totalChars };
    });
  }, [words, wordParts]);

  // Memoized style factory to reduce inline style allocations
  const makeSegmentStyle = useMemo(() => {
    return (
      segBgColor: string | null,
      segTextColor: string | null,
      underline: boolean,
      progress: number,
      index: number
    ) => {
      const isActiveProgress = progress > 0;
      return {
        ...SEGMENT_STYLE,
        backgroundColor: segBgColor || 'transparent',
        color: segTextColor || undefined,
        textDecoration: underline ? 'underline' : undefined,
        opacity: isActiveProgress ? 1 : 0.6,
        transform: isActiveProgress ? 'translateY(0px)' : 'translateY(2px)',
        transition: 'opacity 160ms ease-out, transform 200ms ease-out',
        transitionDelay: `${index * 12}ms`,
      } as React.CSSProperties;
    };
  }, []);

  const WordReveal = memo(function WordReveal({
    index,
    segmentsWithSpace,
    totalChars,
  }: {
    index: number;
    segmentsWithSpace: Array<{
      text: string;
      bgColor: string | null;
      textColor: string | null;
      underline: boolean;
      start: number;
      end: number;
    }>;
    totalChars: number;
  }) {
    const progress = getWordProgress(index);
    const easedProgress = Math.pow(progress, 0.82);
    const revealChars = Math.round(totalChars * easedProgress);
    let remaining = revealChars;

    return (
      <span data-word={index} style={WORD_STYLE}>
        {segmentsWithSpace.map((seg, segIdx) => {
          const segLength = seg.end - seg.start > 0 ? seg.end - seg.start : seg.text.length;
          const visibleCount = Math.min(Math.max(remaining, 0), segLength);
          remaining = Math.max(remaining - segLength, 0);

          const visibleText = seg.text.slice(0, visibleCount);
          const hiddenText = seg.text.slice(visibleCount);
          const segBgColor = seg.bgColor;

          return (
            <span key={`${index}-${segIdx}`} className="inline-block">
              {visibleText && (
                <span
                  style={makeSegmentStyle(segBgColor, seg.textColor, seg.underline, progress, index)}
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
  });

  return (
    <div className="relative inline-block leading-relaxed">
      {words.map((_, index) => (
        <WordReveal
          key={index}
          index={index}
          segmentsWithSpace={precomputed[index].segmentsWithSpace}
          totalChars={precomputed[index].totalChars}
        />
      ))}
    </div>
  );
});
