'use client';
import { useRef, useEffect, memo } from 'react';
import type { Word } from '../utils/lrcAdvanced';
import type { WordRhymeParts, AnimationStyle } from '../types/rhyme';
import { useWordProgress } from '../hooks/useWordProgress';
import { WORD_STYLE, CURSOR_STYLE, SEGMENT_STYLE } from '../config/sync-constants';

interface RhymeWordHighlightProps {
  words: Word[];
  rhymeColorMap: Map<string, string>;
  isActive: boolean;
  isPast: boolean;
  filledWords: number;
  animationStyle: AnimationStyle;
  currentTimeSec: number;
  wordParts?: WordRhymeParts[];
}

export const RhymeWordHighlight = memo(function RhymeWordHighlight({
  words,
  rhymeColorMap,
  isActive,
  isPast,
  filledWords,
  animationStyle,
  currentTimeSec,
  wordParts,
}: RhymeWordHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // const cursorRef = useRef<HTMLDivElement>(null);
  const getWordProgress = useWordProgress(words, currentTimeSec, isPast, filledWords);

  // // Cursor animation effect
  // useEffect(() => {
  //   if (!isActive || !cursorRef.current || animationStyle === 'scale') return;

  //   const activeIdx = words.findIndex((w) => currentTimeSec < w.time);
  //   const currentIdx = activeIdx === -1 ? words.length - 1 : activeIdx - 1;
  //   if (currentIdx < 0) return;

  //   const spans = containerRef.current?.querySelectorAll('span[data-word]') || [];
  //   const current = Array.from(spans).filter(
  //     (s) => parseInt(s.getAttribute('data-word')!) === currentIdx
  //   );
  //   const next = Array.from(spans).filter(
  //     (s) => parseInt(s.getAttribute('data-word')!) === currentIdx + 1
  //   );

  //   if (current.length === 0) return;

  //   const rects = current.map((s) => s.getBoundingClientRect());
  //   const containerRect = containerRef.current!.getBoundingClientRect();
  //   const left = Math.min(...rects.map((r) => r.left)) - containerRect.left;
  //   const right = Math.max(...rects.map((r) => r.right)) - containerRect.left;

  //   let finalLeft = left;
  //   if (next.length > 0 && words[currentIdx + 1]) {
  //     const nextLeft = next[0].getBoundingClientRect().left - containerRect.left;
  //     const progress = Math.min(
  //       Math.max(
  //         (currentTimeSec - words[currentIdx].time) /
  //           (words[currentIdx + 1].time - words[currentIdx].time),
  //         0
  //       ),
  //       1
  //     );
  //     finalLeft = left + (nextLeft - left) * progress;
  //   }

  //   cursorRef.current.style.left = `${finalLeft}px`;
  //   cursorRef.current.style.width = `${right - left}px`;
  //   cursorRef.current.style.opacity = '1';
  // }, [isActive, currentTimeSec, words, animationStyle]);

  return (
    <>
      {/* {animationStyle !== 'scale' && (
        <div
          ref={cursorRef}
          className="pointer-events-none absolute h-8 bg-white/60 blur-lg"
          style={CURSOR_STYLE}
        />
      )} */}

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

          const totalChars = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) || 1;
          const revealChars = Math.round(totalChars * progress);

          let remaining = revealChars;

          return (
            <span key={index} data-word={index} style={WORD_STYLE}>
              {segments.map((seg, segIdx) => {
                const segLength = seg.end - seg.start || seg.text.length;
                const visibleCount = Math.min(Math.max(remaining, 0), segLength);
                remaining = Math.max(remaining - segLength, 0);

                const visibleText = seg.text.slice(0, visibleCount);
                const hiddenText = seg.text.slice(visibleCount);
                
                // Check if segment is punctuation (no alphanumeric chars)
                const isPunctuation = /^[^\w\s']+$/.test(seg.text);
                const segColor = isPunctuation ? null : (seg.color || fallbackColor);

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
