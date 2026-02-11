"use client";
import { useMemo, memo, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Word } from '../utils/lrcAdvanced';
import type { WordRhymeParts } from '../types/rhyme';
import { useWordProgress } from '../hooks/useWordProgress';
import { WORD_STYLE, SEGMENT_STYLE, SEGMENT_ANIMATION } from '../config/sync-constants';

const LIGHT_BG_COLORS = new Set([
  'rgb(232, 217, 255)',
  'rgb(255, 228, 0)',
  'rgb(255, 167, 167)',
  'rgb(241, 241, 241)',
  'rgb(171, 242, 0)',
  'rgb(48, 185, 71)',
  'rgb(209, 178, 255)',
  'rgb(189, 189, 189)',
  'rgb(178, 204, 255)',
  'rgb(0, 216, 255)',
]);

const parseColorToRgb = (color: string): { r: number; g: number; b: number } | null => {
  const trimmed = color.trim();

  const rgbMatch = trimmed.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  const hexMatch = trimmed.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hexMatch)) {
    const r = parseInt(hexMatch[0] + hexMatch[0], 16);
    const g = parseInt(hexMatch[1] + hexMatch[1], 16);
    const b = parseInt(hexMatch[2] + hexMatch[2], 16);
    return { r, g, b };
  }

  if (/^[0-9a-f]{6}$/i.test(hexMatch)) {
    const r = parseInt(hexMatch.slice(0, 2), 16);
    const g = parseInt(hexMatch.slice(2, 4), 16);
    const b = parseInt(hexMatch.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
};

const isLightBackground = (color: string): boolean => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return LIGHT_BG_COLORS.has(color);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155;
};

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

const normalizeWordSegments = (wordText: string, segments: Segment[]): Segment[] => {
  if (segments.length === 0) {
    return [{ text: wordText, bgColor: null, textColor: null, underline: false, start: 0, end: wordText.length }];
  }

  const joined = segments.map((seg) => seg.text).join('');
  if (joined === wordText) return segments;

  const makeNeutral = (text: string): Segment => ({
    text,
    bgColor: null,
    textColor: null,
    underline: false,
    start: -1,
    end: -1,
  });

  if (wordText.endsWith(joined)) {
    const missingPrefix = wordText.slice(0, wordText.length - joined.length);
    return [makeNeutral(missingPrefix), ...segments];
  }

  if (wordText.startsWith(joined)) {
    const missingSuffix = wordText.slice(joined.length);
    return [...segments, makeNeutral(missingSuffix)];
  }

  const idx = wordText.indexOf(joined);
  if (idx >= 0) {
    const prefix = wordText.slice(0, idx);
    const suffix = wordText.slice(idx + joined.length);
    return [
      ...(prefix ? [makeNeutral(prefix)] : []),
      ...segments,
      ...(suffix ? [makeNeutral(suffix)] : []),
    ];
  }

  return [makeNeutral(wordText)];
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

// Calculate the progress for a specific segment within a word during reveal
const getSegmentProgress = (
  wordProgress: number,
  segmentIndex: number,
  totalSegments: number,
  staggerDelay: number,
  revealDuration: number
): number => {
  // Non-colored segments (spaces, non-rhyme text) reveal with the entire word
  // Only color-coded segments (wordRhymeParts) get staggered animation
  if (segmentIndex === 0) {
    return wordProgress;
  }

  // For staggered segments: calculate individual segment reveal window
  const segmentStartTime = segmentIndex * staggerDelay;
  const segmentEndTime = segmentStartTime + revealDuration;

  // Map word progress (0-1) to a time window during the word's reveal
  const wordRevealWindow = 1; // Total word reveal is normalized to 1
  const currentTime = wordProgress * wordRevealWindow;

  if (currentTime < segmentStartTime) return 0;
  if (currentTime >= segmentEndTime) return 1;
  return (currentTime - segmentStartTime) / revealDuration;
};

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
  const segmentRevealsRef = useRef<Map<number, (value: number) => void>>(new Map());

  // Count colored segments (non-space) for stagger calculation
  const coloredSegmentCount = useMemo(() => {
    return segmentsWithSpace.filter(seg => seg.text !== ' ' || seg.bgColor || seg.underline || seg.textColor).length;
  }, [segmentsWithSpace]);

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

  // Handle per-segment reveal animation
  useLayoutEffect(() => {
    if (!wordRef.current) return;

    const elements = wordRef.current.querySelectorAll('[data-segment]');
    const staggerDelay = SEGMENT_ANIMATION.STAGGER_DELAY;

    if (!shouldAnimate) {
      const target = isLineActive && (isPast || index < activeIndex) ? 1 : 0;
      elements.forEach((el) => {
        gsap.set(el, { '--segment-reveal': target });
      });
      return;
    }

    elements.forEach((el, segIdx) => {
      const htmlElement = el as HTMLElement;
      let segmentSetter = segmentRevealsRef.current.get(segIdx);

      if (!segmentSetter) {
        segmentSetter = gsap.quickTo(htmlElement, '--segment-reveal', {
          duration: SEGMENT_ANIMATION.REVEAL_DURATION,
          ease: 'power2.out',
        });
        segmentRevealsRef.current.set(segIdx, segmentSetter);
      }

      gsap.set(htmlElement, { '--segment-reveal': 0 });
      const delay = (segIdx * staggerDelay) / 1000; // Convert to seconds
      gsap.to(htmlElement, {
        '--segment-reveal': 1,
        duration: SEGMENT_ANIMATION.REVEAL_DURATION,
        ease: 'power2.out',
        delay,
        overwrite: true,
      });
    });
  }, [shouldAnimate, segmentsWithSpace, coloredSegmentCount, isLineActive, isPast, index, activeIndex]);

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

        const segmentRevealDefault = isLineActive && (isPast || index < activeIndex) ? 1 : 0;

        return (
          <span
            key={`${index}-segment-${segIdx}`}
            data-segment={segIdx}
            className="relative inline-block"
            style={{
              '--segment-reveal': segmentRevealDefault,
            } as React.CSSProperties}
          >
            {isLineActive && seg.bgColor && (
              <span
                className="absolute inset-0"
                aria-hidden="true"
                style={{
                  backgroundColor: seg.bgColor,
                  transform: 'scaleX(var(--segment-reveal, var(--reveal, 0)))',
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
                  isLineActive && seg.bgColor && isLightBackground(seg.bgColor) && (isPast || index <= activeIndex)
                    ? 'black'
                    : undefined,
                opacity: 0.6 + (easedProgress * 0.4),
                transform: `translateY(${2 - (easedProgress * 2)}px) scaleX(${0.95 + (easedProgress * 0.05)})`,
                transformOrigin: 'left center',
                ...styleCache(seg.textColor, seg.underline, isRevealed),
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
      const baseSegments =
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

      const segments = normalizeWordSegments(word.text, baseSegments);

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
        const style: React.CSSProperties = {
          ...SEGMENT_STYLE,
        };

        if (isRevealed && textColor) {
          style.color = textColor;
        }

        if (isRevealed && underline) {
          style.textDecoration = 'underline';
        }

        cache.set(key, style);
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
