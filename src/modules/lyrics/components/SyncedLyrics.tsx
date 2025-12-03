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
  mode = 'auto' 
}: {
  syncedLyrics: string;
  currentPositionMs: number;
  isPlaying: boolean;
  rhymeEncodedLines?: string[];
  showRhymes?: boolean;
  mode?: 'auto' | 'word' | 'line';
}) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    const el = containerRef.current.children[activeLineIndex] as HTMLElement;
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
      className="max-h-96 overflow-y-auto bg-gray-50 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
    >
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
                isActive ? 'bg-yellow-100 scale-105' : 'bg-white'
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
              isActive ? 'bg-yellow-100 scale-101' : 'bg-white'
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
              />
            )}

            {shouldUseWordSync && hasWords && !showRhymeContent && (
              <PlainWordSync lineText={lineText} words={words} activeWordIndex={activeWordIndex} isActive={isActive} />
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
  );
}

// ──────────────────────────────────────────────────────────────────────
// Rhyme + Word Sync (Progressive Reveal + Pop)
// ──────────────────────────────────────────────────────────────────────
function RhymeEncodedWordSync({
  rhymeHtml,
  words,
  activeWordIndex,
  isActive,
  isPast,
  currentTimeSec
}: {
  rhymeHtml: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
  isPast: boolean;
  currentTimeSec: number;
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

  useEffect(() => {
    if (!containerRef.current) return;
    const spans = containerRef.current.querySelectorAll('span[data-word-index]');

    spans.forEach(span => {
      const el = span as HTMLElement;
      const wordIdx = parseInt(el.getAttribute('data-word-index')!, 10);
      const originalBg = window.getComputedStyle(el).backgroundColor;

      let progress = 0;
      let isCurrent = false;

      if (isPast || (isActive && activeWordIndex !== null && wordIdx < activeWordIndex)) {
        el.style.backgroundColor = originalBg;
        el.style.backgroundImage = 'none';
      } else if (isActive && activeWordIndex === wordIdx) {
        isCurrent = true;
        const word = words[wordIdx];
        progress = Math.max(0, Math.min(1, (currentTimeSec - word.start) / (word.end! - word.start)));
        
        if (progress >= 0.98) {
          el.style.backgroundColor = originalBg;
          el.style.backgroundImage = 'none';
        } else {
          el.style.background = `linear-gradient(to right, ${originalBg} ${progress * 100}%, transparent ${progress * 100}%)`;
        }
      } else {
        el.style.backgroundColor = 'transparent';
        el.style.backgroundImage = 'none';
      }

      // Pop animation
      el.style.transform = isCurrent && progress < 0.2 ? 'scale(1.08)' : 'scale(1.02)';
      el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });
  }, [isActive, isPast, activeWordIndex, currentTimeSec, words]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: mappedHtml }} />;
}

// ──────────────────────────────────────────────────────────────────────
// Plain Word Sync (Green highlight fallback)
// ──────────────────────────────────────────────────────────────────────
function PlainWordSync({
  lineText,
  words,
  activeWordIndex,
  isActive
}: {
  lineText: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
}) {
  let wordCounter = 0;
  const parts = lineText.split(/(\s+|\S+)/g).filter(Boolean);

  return (
    <span>
      {parts.map((part, i) => {
        if (!/\S/.test(part)) return <span key={i}>{part}</span>;
        const idx = wordCounter++;
        const highlighted = isActive && activeWordIndex !== null && idx <= activeWordIndex;
        return (
          <span
            key={i}
            className="transition-all duration-150 inline-block"
            style={{
              backgroundColor: highlighted ? 'rgba(34, 197, 94, 0.4)' : 'transparent',
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