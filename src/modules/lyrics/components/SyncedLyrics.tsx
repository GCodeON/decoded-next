'use client';
import { useRef, useEffect, useMemo } from 'react';
import { useLiricleSync } from '@/modules/lyrics/hooks/useLiricleSync';
import type { Word } from '@/modules/lyrics/utils/lrcAdvanced';

// ──────────────────────────────────────────────────────────────────────
// Unified Lyrics Component — handles:
// 1. Line-level sync (fallback)
// 2. Word-level sync (with progressive reveal)
// 3. Rhyme-encoded HTML with perfect color reveal
// 4. Plain text fallback
// ──────────────────────────────────────────────────────────────────────
export default function SyncedLyrics({
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
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const {
    activeLine: activeLineIndex,
    activeWordIndex,
    lines,
    wordsByLine,
    error
  } = useLiricleSync({
    lrcText: syncedLyrics,
    currentPositionMs,
    isPlaying
  });

  // Auto-scroll
  useEffect(() => {
    if (activeLineIndex === null || !containerRef.current) return;
    const el = containerRef.current.querySelector('.lyrics-container')?.children[activeLineIndex] as HTMLElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex]);

  const currentTimeSec = currentPositionMs / 1000;

  const isWordSynced = wordsByLine.some(line => line.length > 0);
  const shouldUseWordSync = mode === 'word' || (mode === 'auto' && isWordSynced);

  const htmlIsVisuallyEmpty = (html?: string) =>
    !html || html.replace(/<[^>]*>/g, '').trim().length === 0;

  if (error) {
    return <div className="text-red-500 p-4">Lyrics sync error: {error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative max-h-96 overflow-y-auto bg-gray-50 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
    >
      {/* Liricle-style cursor */}
      <div 
        ref={cursorRef}
        className={`lyric-word-cursor ${shouldUseWordSync && animationStyle === 'cursor' ? 'active' : ''}`}
      />
      
      <div className="lyrics-container">
        {lines.map((line, i) => {
        const lineText = line.trim();
        const isActive = i === activeLineIndex;
        const isPast = activeLineIndex !== null && i < activeLineIndex;
        const words = wordsByLine[i] || [];
        const hasWords = words.length > 0;
        const rhymeHtml = rhymeEncodedLines?.[i];
        const showRhymeContent = showRhymes && rhymeHtml && !htmlIsVisuallyEmpty(rhymeHtml);

        // Instrumental
        if (!lineText) {
          return (
            <div
              key={i}
              className={`synced-line px-4 py-2 rounded-lg shadow-sm transition-all duration-200 text-black text-md md:text-xl font-medium ${
                isActive ? 'bg-yellow-100 active-line' : isPast ? 'bg-white past-line' : 'bg-white'
              }`}
            >
              <span className="text-gray-400 italic">(instrumental)</span>
            </div>
          );
        }

        return (
          <div
            key={i}
            className={`synced-line px-2 py-2 rounded-lg shadow-sm transition-all duration-400 text-black text-md md:text-xl font-medium ${
              isActive ? 'bg-yellow-100 active-line' : isPast ? 'bg-white past-line' : 'bg-white'
            }`}
          >
            {/* WORD-LEVEL SYNC (Best Experience) */}
            {shouldUseWordSync && hasWords && showRhymeContent && (
              <RhymeEncodedWordSync
                rhymeHtml={rhymeHtml}
                words={words}
                activeWordIndex={activeWordIndex}
                isActive={isActive}
                isPast={isPast}
                currentTimeSec={currentTimeSec}
                animationStyle={animationStyle}
                cursorRef={cursorRef}
                lineIndex={i}
              />
            )}

            {shouldUseWordSync && hasWords && !showRhymeContent && (
              <PlainWordSync 
                lineText={lineText} 
                words={words} 
                activeWordIndex={activeWordIndex} 
                isActive={isActive}
                animationStyle={animationStyle}
                cursorRef={cursorRef}
                lineIndex={i}
              />
            )}

            {/* LINE-LEVEL FALLBACK (when no word timing or forced) */}
            {(!shouldUseWordSync || !hasWords) && showRhymeContent && (
              <div dangerouslySetInnerHTML={{ __html: rhymeHtml }} />
            )}

            {(!shouldUseWordSync || !hasWords) && !showRhymeContent && (
              <span>{lineText}</span>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Rhyme + Word Sync (Liricle cursor or scale animation)
// ──────────────────────────────────────────────────────────────────────
function RhymeEncodedWordSync({
  rhymeHtml,
  words,
  activeWordIndex,
  isActive,
  isPast,
  currentTimeSec,
  animationStyle,
  cursorRef,
  lineIndex
}: {
  rhymeHtml: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
  isPast: boolean;
  currentTimeSec: number;
  animationStyle: 'cursor' | 'scale' | 'hybrid';
  cursorRef: React.RefObject<HTMLDivElement>;
  lineIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mappedHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(rhymeHtml, 'text/html');
    const spans = doc.querySelectorAll('span');

    let wordIdx = 0;
    let charOffset = 0;
    const wordTexts = words.map(w => w.text.toLowerCase().replace(/[^\w']/g, ''));

    spans.forEach((span, i) => {
      const text = (span.textContent || '').toLowerCase().replace(/[^\w']/g, '');
      if (!text) return;

      while (wordIdx < wordTexts.length) {
        const word = wordTexts[wordIdx];
        const remaining = word.slice(charOffset);

        if (remaining.includes(text)) {
          span.setAttribute('data-word-index', String(wordIdx));
          // Store original background color as data attribute
          const bgColor = span.style.backgroundColor || window.getComputedStyle(span).backgroundColor;
          if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
            span.setAttribute('data-original-bg', bgColor);
          }
          charOffset += text.length;
          if (charOffset >= word.length) {
            wordIdx++;
            charOffset = 0;
          }
          break;
        } else {
          wordIdx++;
          charOffset = 0;
        }
      }
    });

    return doc.body.innerHTML;
  }, [rhymeHtml, words]);

  // Update cursor position (Liricle-style)
  useEffect(() => {
    if (!containerRef.current || !cursorRef.current || animationStyle === 'scale') return;
    if (!isActive || activeWordIndex === null) return;

    const spans = containerRef.current.querySelectorAll('span[data-word-index]');
    const currentWordSpans: HTMLElement[] = [];
    
    spans.forEach(span => {
      const el = span as HTMLElement;
      const wordIdx = parseInt(el.getAttribute('data-word-index')!, 10);
      if (wordIdx === activeWordIndex) {
        currentWordSpans.push(el);
      }
    });

    if (currentWordSpans.length === 0) return;

    // Calculate bounding box of all spans for this word
    const firstSpan = currentWordSpans[0];
    const lastSpan = currentWordSpans[currentWordSpans.length - 1];
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const firstRect = firstSpan.getBoundingClientRect();
    const lastRect = lastSpan.getBoundingClientRect();

    const left = firstRect.left - containerRect.left + containerRef.current.scrollLeft;
    const top = firstRect.bottom - containerRect.top + containerRef.current.scrollTop;
    const width = lastRect.right - firstRect.left;

    cursorRef.current.style.width = `${width}px`;
    cursorRef.current.style.left = `${left}px`;
    cursorRef.current.style.top = `${top}px`;
  }, [isActive, activeWordIndex, animationStyle, cursorRef, currentTimeSec]);

  // Handle scale animation or gradient fill for non-cursor modes
  useEffect(() => {
    if (!containerRef.current || animationStyle === 'cursor') return;
    // Only process active lines - past lines are already set and shouldn't be touched
    if (!isActive) return;
    
    const spans = containerRef.current.querySelectorAll('span[data-word-index]');

    spans.forEach(span => {
      const el = span as HTMLElement;
      const wordIdx = parseInt(el.getAttribute('data-word-index')!, 10);
      // Get original background from data attribute (stored before CSS hides it)
      const originalBg = el.getAttribute('data-original-bg') || '';

      let isCurrent = false;

      if (activeWordIndex !== null && wordIdx < activeWordIndex) {
        // Past words in active line: only set if not already set
        if (originalBg && el.style.backgroundColor !== originalBg) {
          el.style.backgroundColor = originalBg;
          el.style.backgroundImage = 'none';
          el.style.background = '';
        }
      } else if (activeWordIndex === wordIdx) {
        // Current word: show full background color (instant reveal like karaoke)
        isCurrent = true;
        if (originalBg && el.style.backgroundColor !== originalBg) {
          el.style.backgroundColor = originalBg;
          el.style.backgroundImage = 'none';
          el.style.background = '';
        }
      } else {
        // Future words in active line - only clear if not already cleared
        if (el.style.backgroundColor !== '') {
          el.style.backgroundColor = '';
          el.style.backgroundImage = '';
          el.style.background = '';
        }
      }

      // Scale animation for scale/hybrid modes
      if (animationStyle === 'scale' || animationStyle === 'hybrid') {
        const targetTransform = isCurrent ? 'scale(1.08)' : 'scale(1.02)';
        if (el.style.transform !== targetTransform) {
          el.style.transform = targetTransform;
          el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
      } else {
        if (el.style.transform !== 'none') {
          el.style.transform = 'none';
        }
      }
    });
  }, [isActive, activeWordIndex, animationStyle]); // Only run when active line or word changes

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: mappedHtml }} />;
}

// ──────────────────────────────────────────────────────────────────────
// Plain Word Sync (cursor or green highlight)
// ──────────────────────────────────────────────────────────────────────
function PlainWordSync({
  lineText,
  words,
  activeWordIndex,
  isActive,
  animationStyle,
  cursorRef,
  lineIndex
}: {
  lineText: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
  animationStyle: 'cursor' | 'scale' | 'hybrid';
  cursorRef: React.RefObject<HTMLDivElement>;
  lineIndex: number;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  let wordCounter = 0;
  const parts = lineText.split(/(\s+|\S+)/g).filter(Boolean);

  // Update cursor for plain text
  useEffect(() => {
    if (!containerRef.current || !cursorRef.current || animationStyle !== 'cursor') return;
    if (!isActive || activeWordIndex === null) return;

    const wordSpans = containerRef.current.querySelectorAll('span[data-word-idx]');
    const currentSpan = Array.from(wordSpans).find(span => {
      return parseInt((span as HTMLElement).getAttribute('data-word-idx')!, 10) === activeWordIndex;
    }) as HTMLElement;

    if (!currentSpan) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const spanRect = currentSpan.getBoundingClientRect();

    cursorRef.current.style.width = `${spanRect.width}px`;
    cursorRef.current.style.left = `${spanRect.left - containerRect.left + containerRef.current.scrollLeft}px`;
    cursorRef.current.style.top = `${spanRect.bottom - containerRect.top + containerRef.current.scrollTop}px`;
  }, [isActive, activeWordIndex, animationStyle, cursorRef]);

  return (
    <span ref={containerRef}>
      {parts.map((part, i) => {
        if (!/\S/.test(part)) return <span key={i}>{part}</span>;
        const idx = wordCounter++;
        const highlighted = isActive && activeWordIndex !== null && idx <= activeWordIndex;
        return (
          <span
            key={i}
            data-word-idx={idx}
            className="transition-all duration-150 inline-block"
            style={{
              backgroundColor: animationStyle !== 'cursor' && highlighted 
                ? 'rgba(34, 197, 94, 0.4)' 
                : 'transparent',
              borderRadius: '4px',
              padding: '0 2px'
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}