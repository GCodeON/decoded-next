"use client";
import { useMemo, memo, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Word } from '../utils/lrcAdvanced';
import type { WordRhymeParts } from '../types/rhyme';
import { useWordProgress } from '../hooks/useWordProgress';
import { WORD_STYLE, SEGMENT_STYLE } from '../config/sync-constants';

const LIGHT_BG_COLORS = new Set([
  'rgb(232, 217, 255)',
  'rgb(255, 228, 0)',
  'rgb(255, 167, 167)',
  'rgb(241, 241, 241)',
  'rgb(171, 242, 0)',
  'rgb(48, 185, 71)',
  'rgb(209, 178, 255)',
  'rgb(189, 189, 189)',
  'rgb(178, 204, 255)'
]);

interface RhymeWordHighlightProps {
  words: Word[];
  isActive: boolean;
  isPast: boolean;
  filledWords: number;
  currentTimeSec: number;
  wordParts?: WordRhymeParts[];
}

type Segment = {
  text: string;
  bgColor: string | null;
  textColor: string | null;
  underline: boolean;
  start: number;
  end: number;
};

interface WordRevealProps {
  index: number;
  segmentsWithSpace: Segment[];
  activeWordIndex: number;
  isPast: boolean;
  isActive: boolean;
  getWordProgress: (index: number) => number;
  styleCache: (textColor: string | null, underline: boolean, isRevealed: boolean) => React.CSSProperties;
}

const WordReveal = memo(function WordReveal({
  index,
  segmentsWithSpace,
  activeWordIndex,
  isPast,
  isActive,
  getWordProgress,
  styleCache,
}: WordRevealProps) {
  const progress = getWordProgress(index);
  const easedProgress = Math.pow(progress, 0.82);
  const wordDelay = index * 12;
  const isLineActive = isActive || isPast;
  const activeIndex = isLineActive ? activeWordIndex : -1;
  const shouldAnimate = isLineActive && !isPast && index === activeIndex;
  const isRevealed = isLineActive && (isPast || index < activeIndex || (index === activeIndex && progress > 0));
  const wordRef = useRef<HTMLSpanElement>(null);
  const lastRevealRef = useRef(0);
  const hasActivatedRef = useRef(false);
  const revealSetterRef = useRef<((value: number) => void) | null>(null);

  useLayoutEffect(() => {
    if (!wordRef.current) return;
    if (!revealSetterRef.current) {
      revealSetterRef.current = gsap.quickTo(wordRef.current, '--reveal', {
        duration: 0.2,
        ease: 'power2.out',
      });
      gsap.set(wordRef.current, { '--reveal': 0 });
    }
    const last = lastRevealRef.current;

    if (!shouldAnimate) {
      const target = isLineActive
        ? isPast || index < activeIndex
          ? 1
          : 0
        : 0;
      lastRevealRef.current = target;
      hasActivatedRef.current = false;
      gsap.set(wordRef.current, { '--reveal': target });
      return;
    }

    if (hasActivatedRef.current) return;
    hasActivatedRef.current = true;
    lastRevealRef.current = 1;
    if (revealSetterRef.current) {
      gsap.set(wordRef.current, { '--reveal': 0 });
      revealSetterRef.current(1);
    } else {
      gsap.to(wordRef.current, {
        '--reveal': 1,
        duration: 0.2,
        ease: 'power2.out',
        delay: wordDelay / 1000,
        overwrite: true,
      });
    }
  }, [shouldAnimate, wordDelay, isPast, index, activeIndex, easedProgress, isLineActive]);

  return (
    <span
      ref={wordRef}
      data-word={index}
      style={{
        ...WORD_STYLE,
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {segmentsWithSpace.map((seg, segIdx) => {
        const isSpace = seg.text === ' ' && !seg.bgColor && !seg.underline && !seg.textColor;
        if (isSpace) {
          return (
            <span key={`${index}-space-${segIdx}`} className="inline-block">
              {seg.text}
            </span>
          );
        }

        return (
          <span
            key={`${index}-segment-${segIdx}`}
            className="relative inline-block"
            style={styleCache(seg.textColor, seg.underline, isRevealed)}
          >
            {isLineActive && seg.bgColor && (
              <span
                className="absolute inset-0"
                aria-hidden="true"
                style={{
                  backgroundColor: seg.bgColor,
                  transform: 'scaleX(var(--reveal, 0))',
                  transformOrigin: 'left center',
                  willChange: 'transform',
                  zIndex: 0,
                }}
              />
            )}
            <span
              style={{
                display: 'inline-block',
                position: 'relative',
                zIndex: 1,
                color:
                  isLineActive && seg.bgColor && LIGHT_BG_COLORS.has(seg.bgColor) && (isPast || index <= activeIndex)
                    ? 'black'
                    : undefined,
                opacity: 0.6 + (easedProgress * 0.4),
                transform: `translateY(${2 - (easedProgress * 2)}px) scaleX(${0.95 + (easedProgress * 0.05)})`,
                transformOrigin: 'left center',
              }}
            >
              {seg.text}
            </span>
          </span>
        );
      })}
    </span>
  );
});

export const RhymeWordHighlight = memo(function RhymeWordHighlight({
  words,
  isActive,
  isPast,
  filledWords,
  currentTimeSec,
  wordParts,
}: RhymeWordHighlightProps) {
  const activeWordIndex = (isActive || isPast) ? (filledWords > 0 ? filledWords - 1 : -1) : -1;
  const getWordProgress = useWordProgress(words, currentTimeSec, isPast, activeWordIndex);

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

      return { segmentsWithSpace };
    });
  }, [words, wordParts]);

  // Style cache to return stable objects and reduce allocations
  const styleCache = useMemo(() => {
    const cache = new Map<string, React.CSSProperties>();
    return (textColor: string | null, underline: boolean, isRevealed: boolean) => {
      const key = `${textColor}|${underline}|${isRevealed}`;
      if (!cache.has(key)) {
        cache.set(key, {
          ...SEGMENT_STYLE,
          color: isRevealed ? textColor || undefined : undefined,
          textDecoration: isRevealed && underline ? 'underline' : undefined,
        });
      }
      return cache.get(key)!;
    };
  }, []);

  return (
    <div className="relative inline-block leading-relaxed">
      {words.map((_, index) => (
        <WordReveal
          key={index}
          index={index}
          segmentsWithSpace={precomputed[index].segmentsWithSpace}
          activeWordIndex={activeWordIndex}
          isPast={isPast}
          isActive={isActive}
          getWordProgress={getWordProgress}
          styleCache={styleCache}
        />
      ))}
    </div>
  );
}, (prev, next) => {
  const sameBase =
    prev.words === next.words &&
    prev.wordParts === next.wordParts &&
    prev.isActive === next.isActive &&
    prev.isPast === next.isPast &&
    prev.filledWords === next.filledWords;

  if (!sameBase) return false;
  if (prev.isActive || next.isActive) {
    return prev.currentTimeSec === next.currentTimeSec;
  }
  return true;
});
