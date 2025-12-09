'use client';
import { useRef, useEffect, useMemo } from 'react';
import { useLiricleSync } from '@/modules/lyrics/hooks/useLiricleSync';
import type { Word } from '@/modules/lyrics/utils/lrcAdvanced';

// ──────────────────────────────────────────────────────────────────────
// Rhyme parsing helpers
// ──────────────────────────────────────────────────────────────────────
type RhymeSegment = {
  text: string;
  color: string | null;
  start: number;
  end: number;
};

type WordRhymeParts = RhymeSegment[];

type ParsedRhymeLine = {
  text: string;
  segments: RhymeSegment[];
};

type RhymeColorData = {
  colorMap: Map<string, string>;
  wordPartsByLine: WordRhymeParts[][];
};

const extractColor = (style: string): string | null => {
  if (!style) return null;
  const bgMatch = style.match(/background-color:\s*([^;]+)/i);
  if (bgMatch?.[1]) return bgMatch[1].trim();
  const colorMatch = style.match(/color:\s*([^;]+)/i);
  return colorMatch?.[1]?.trim() || null;
};

const parseRhymeLine = (html?: string): ParsedRhymeLine | null => {
  if (!html) return null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const segments: RhymeSegment[] = [];
  let cursor = 0;

  const walk = (node: ChildNode, activeColor: string | null) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return;
      const start = cursor;
      const end = start + text.length;
      segments.push({ text, color: activeColor, start, end });
      cursor = end;
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const nextColor = el.tagName.toLowerCase() === 'span'
        ? extractColor(el.getAttribute('style') || '') || activeColor
        : activeColor;

      Array.from(el.childNodes).forEach(child => walk(child, nextColor));
      return;
    }
  };

  Array.from(wrapper.childNodes).forEach(child => walk(child, null));

  const text = segments.map(s => s.text).join('');
  return { text, segments };
};

const buildWordRanges = (lineText: string, words: Word[]) => {
  const ranges: { start: number; end: number; text: string }[] = [];
  let searchFrom = 0;

  for (const word of words) {
    const exact = lineText.indexOf(word.text, searchFrom);
    const idx = exact !== -1 ? exact : lineText.toLowerCase().indexOf(word.text.toLowerCase(), searchFrom);
    if (idx === -1) {
      ranges.push({ start: -1, end: -1, text: word.text });
      continue;
    }

    const start = idx;
    const end = idx + word.text.length;
    ranges.push({ start, end, text: word.text });
    searchFrom = end;
  }

  return ranges;
};

const sliceSegmentsToWords = (lineText: string, words: Word[], parsed?: ParsedRhymeLine | null): WordRhymeParts[] => {
  if (!parsed) return words.map(() => []);

  const ranges = buildWordRanges(lineText, words);
  return ranges.map(range => {
    if (range.start === -1) return [];

    const parts: RhymeSegment[] = [];
    parsed.segments.forEach(seg => {
      const overlapStart = Math.max(range.start, seg.start);
      const overlapEnd = Math.min(range.end, seg.end);
      if (overlapStart >= overlapEnd) return;

      const localStart = overlapStart - seg.start;
      const localEnd = overlapEnd - seg.start;
      const text = seg.text.slice(localStart, localEnd);
      if (text) {
        parts.push({
          text,
          color: seg.color,
          start: overlapStart,
          end: overlapEnd,
        });
      }
    });

    if (parts.length === 0) {
      parts.push({ text: range.text, color: null, start: range.start, end: range.end });
    }

    return parts;
  });
};

// Build per-word rhyme parts (multiple spans per word) and a fallback color map
const useRhymeColorMap = (
  rhymeEncodedLines: string[] | undefined,
  lines: string[],
  wordsByLine: Word[][]
): RhymeColorData => {
  return useMemo(() => {
    const colorMap = new Map<string, string>();
    const parsedLines = (rhymeEncodedLines || []).map(line => parseRhymeLine(line));

    parsedLines.forEach(parsed => {
      if (!parsed) return;
      parsed.segments.forEach(seg => {
        const clean = seg.text.toLowerCase().replace(/[^\w']/g, '');
        if (!clean || !seg.color) return;
        if (!colorMap.has(clean)) colorMap.set(clean, seg.color);
      });
    });

    const wordPartsByLine: WordRhymeParts[][] = lines.map((lineText, idx) => {
      const words = wordsByLine[idx] || [];
      return sliceSegmentsToWords(lineText, words, parsedLines[idx]);
    });

    return { colorMap, wordPartsByLine };
  }, [rhymeEncodedLines, lines, wordsByLine]);
};

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
const SyncedLyrics = ({
  syncedLyrics,
  currentPositionMs,
  isPlaying,
  rhymeEncodedLines,
  showRhymes = true,
  mode = 'auto',
  animationStyle = 'scale'
}: {
  syncedLyrics: string;
  currentPositionMs: number;
  isPlaying: boolean;
  rhymeEncodedLines?: string[];
  showRhymes?: boolean;
  mode?: 'auto' | 'word' | 'line';
  animationStyle?: 'cursor' | 'scale' | 'hybrid';
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeLine: activeLineIndex, lines, wordsByLine, error } = useLiricleSync({
    lrcText: syncedLyrics,
    currentPositionMs,
    isPlaying
  });

  const currentTimeSec = currentPositionMs / 1000;
  const isWordSynced = wordsByLine.some(line => line.length > 0);
  const shouldUseWordSync = mode === 'word' || (mode === 'auto' && isWordSynced);
  const { colorMap: rhymeColorMap, wordPartsByLine } = useRhymeColorMap(rhymeEncodedLines, lines, wordsByLine);

  // Filled words in active line
  let filledWords = 0;
  if (activeLineIndex !== null) {
    const words = wordsByLine[activeLineIndex] || [];
    const idx = words.findIndex(w => currentTimeSec < w.time);
    filledWords = idx === -1 ? words.length : idx;
  }

  // Auto-scroll
  useEffect(() => {
    if (activeLineIndex === null || !containerRef.current) return;
    const el = containerRef.current.children[activeLineIndex] as HTMLElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex]);

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <div ref={containerRef} className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-zinc-900 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400">
      {lines.map((line, i) => {
        const text = line.trim();
        const isActive = i === activeLineIndex;
        const isPast = activeLineIndex !== null && i < activeLineIndex;
        const words = wordsByLine[i] || [];

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
              <PlainWordHighlight lineText={text} isActive={isActive} filledWords={filledWords} />
            ) : (
              <span>{text}</span>
            )}

            {(!shouldUseWordSync || !words.length) && showRhymes && (
              <div dangerouslySetInnerHTML={{ __html: rhymeEncodedLines?.[i] || '' }} />
            )}

            {(!shouldUseWordSync || !words.length) && !showRhymes && (
              <span>{text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

function RhymeWordHighlight({
  words,
  rhymeColorMap,
  isActive,
  isPast,
  filledWords,
  animationStyle,
  currentTimeSec,
  wordParts,
}: {
  words: Word[];
  rhymeColorMap: Map<string, string>;
  isActive: boolean;
  isPast: boolean;
  filledWords: number;
  animationStyle: 'cursor' | 'scale' | 'hybrid';
  currentTimeSec: number;
  wordParts?: WordRhymeParts[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const getWordProgress = (index: number) => {
    if (isPast || index < filledWords) return 1;
    const word = words[index];
    const next = words[index + 1];
    const prev = words[index - 1];

    const start = word.time;
    const end = next?.time
      ?? start + Math.max(0.4, Math.min(1.5, prev ? start - prev.time : 0.6));

    if (currentTimeSec <= start) return 0;
    if (currentTimeSec >= end) return 1;
    return (currentTimeSec - start) / Math.max(end - start, 0.001);
  };

  useEffect(() => {
    if (!isActive || !cursorRef.current || animationStyle === 'scale') return;

    const activeIdx = words.findIndex(w => currentTimeSec < w.time);
    const currentIdx = activeIdx === -1 ? words.length - 1 : activeIdx - 1;
    if (currentIdx < 0) return;

    const spans = containerRef.current?.querySelectorAll('span[data-word]') || [];
    const current = Array.from(spans).filter(s => parseInt(s.getAttribute('data-word')!) === currentIdx);
    const next = Array.from(spans).filter(s => parseInt(s.getAttribute('data-word')!) === currentIdx + 1);

    if (current.length === 0) return;

    const rects = current.map(s => s.getBoundingClientRect());
    const containerRect = containerRef.current!.getBoundingClientRect();
    const left = Math.min(...rects.map(r => r.left)) - containerRect.left;
    const right = Math.max(...rects.map(r => r.right)) - containerRect.left;

    let finalLeft = left;
    if (next.length > 0 && words[currentIdx + 1]) {
      const nextLeft = next[0].getBoundingClientRect().left - containerRect.left;
      const progress = Math.min(
        Math.max((currentTimeSec - words[currentIdx].time) / (words[currentIdx + 1].time - words[currentIdx].time), 0),
        1
      );
      finalLeft = left + (nextLeft - left) * progress;
    }

    cursorRef.current.style.left = `${finalLeft}px`;
    cursorRef.current.style.width = `${right - left}px`;
    cursorRef.current.style.opacity = '1';
  }, [isActive, currentTimeSec, words, animationStyle]);

  return (
    <>
      {animationStyle !== 'scale' && (
        <div
          ref={cursorRef}
          className="pointer-events-none absolute h-8 bg-white/60 blur-lg"
          style={{ width: '4px', top: '4px', transition: 'all 0.05s linear', opacity: 0 }}
        />
      )}

      <div ref={containerRef} className="relative inline-block leading-relaxed">
        {words.map((word, index) => {
          const clean = word.text.toLowerCase().replace(/[^\w']/g, '');
          const fallbackColor = rhymeColorMap.get(clean) || undefined;
          const progress = getWordProgress(index);

          const segments = (wordParts && wordParts[index] && wordParts[index].length > 0)
            ? wordParts[index]
            : [{ text: word.text, color: fallbackColor || null, start: 0, end: word.text.length }];

          const totalChars = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) || 1;
          const revealChars = Math.round(totalChars * progress);

          let remaining = revealChars;

          return (
            <span
              key={index}
              data-word={index}
              style={{
                padding: '0.05em 0.15em',
                borderRadius: '6px',
                margin: '0 0.05em',
                display: 'inline-block',
              }}
            >
              {segments.map((seg, segIdx) => {
                const segLength = seg.end - seg.start || seg.text.length;
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
                          transition: 'background-color 0.35s ease',
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
}

// Plain fallback
function PlainWordHighlight({ lineText, isActive, filledWords }: { lineText: string; isActive: boolean; filledWords: number }) {
  return (
    <div className={isActive ? 'font-bold' : 'opacity-70'}>
      {lineText.split(/(\s+)/).map((part, i) => {
        if (/\s/.test(part)) return part;
        const wordIdx = Math.floor(i / 2);
        const isFilled = isActive && wordIdx < filledWords;
        return (
          <span
            key={i}
            style={{
              background: isFilled ? 'linear-gradient(90deg, #29e2f6, #60e8ff)' : undefined,
              backgroundClip: isFilled ? 'text' : undefined,
              WebkitBackgroundClip: isFilled ? 'text' : undefined,
              color: isFilled ? 'transparent' : 'inherit',
              transition: 'all 0.25s ease',
            }}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
}

export default SyncedLyrics;