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
  animationStyle = 'cursor' 
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
      className="max-h-96 overflow-y-auto bg-gray-50 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
    >
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
            className={`synced-line relative px-2 py-2 rounded-lg shadow-sm transition-all duration-400 text-black text-md md:text-xl font-medium ${
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
                lineIndex={i}
                currentTimeSec={currentTimeSec}
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
  lineIndex
}: {
  rhymeHtml: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
  isPast: boolean;
  currentTimeSec: number;
  animationStyle: 'cursor' | 'scale' | 'hybrid';
  lineIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const lastProcessedWordRef = useRef<number | null>(null);

  const mappedHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(rhymeHtml, 'text/html');
    
    let wordIdx = 0;
    let charsSoFar = 0;
    
    // Get all text content to map character positions to word indices
    const fullText = doc.body.textContent || '';
    const wordBoundaries: { start: number; end: number; wordIdx: number }[] = [];
    
    words.forEach((word, idx) => {
      // Find word position in full text
      const cleanWord = word.text.toLowerCase().replace(/[^\w']/g, '');
      let searchStart = charsSoFar;
      
      // Search for this word in the remaining text
      const remainingText = fullText.slice(searchStart).toLowerCase().replace(/[^\w']/g, '');
      const wordPos = remainingText.indexOf(cleanWord);
      
      if (wordPos !== -1) {
        wordBoundaries.push({
          start: searchStart + wordPos,
          end: searchStart + wordPos + cleanWord.length,
          wordIdx: idx
        });
        charsSoFar = searchStart + wordPos + cleanWord.length;
      }
    });
    
    // Now traverse and mark all elements
    let textPos = 0;
    
    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const cleanText = text.toLowerCase().replace(/[^\w']/g, '');
        
        if (cleanText) {
          // Find which word(s) this text belongs to
          const matchingBoundary = wordBoundaries.find(wb => 
            textPos >= wb.start && textPos < wb.end
          );
          
          if (matchingBoundary && node.parentElement) {
            node.parentElement.setAttribute('data-word-index', String(matchingBoundary.wordIdx));
          }
          
          textPos += cleanText.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        
        // Store original background color
        const bgColor = el.style.backgroundColor;
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
          el.setAttribute('data-original-bg', bgColor);
        }
        
        // Process children
        Array.from(node.childNodes).forEach(traverse);
      }
    };
    
    Array.from(doc.body.childNodes).forEach(traverse);
    
    return doc.body.innerHTML;
  }, [rhymeHtml, words]);

  // Update cursor position with smooth interpolation (Liricle-style)
  useEffect(() => {
    if (!containerRef.current || !cursorRef.current || animationStyle === 'scale') return;
    if (!isActive || activeWordIndex === null) return;

    // Get ALL elements/text that make up the current word (including spaces, punctuation, etc.)
    const allElements = containerRef.current.querySelectorAll('span');
    const currentWordElements: HTMLElement[] = [];
    const nextWordElements: HTMLElement[] = [];
    
    allElements.forEach(el => {
      const wordIdx = el.getAttribute('data-word-index');
      if (wordIdx !== null) {
        const idx = parseInt(wordIdx, 10);
        if (idx === activeWordIndex) {
          currentWordElements.push(el);
        } else if (idx === activeWordIndex + 1) {
          nextWordElements.push(el);
        }
      }
    });

    if (currentWordElements.length === 0) return;

    // Get current word timing
    const currentWord = words[activeWordIndex];
    if (!currentWord) return;

    // Calculate bounding box for ALL elements in current word
    const containerRect = containerRef.current.getBoundingClientRect();
    const rects = currentWordElements.map(el => el.getBoundingClientRect());
    
    const currentLeft = Math.min(...rects.map(r => r.left)) - containerRect.left;
    const currentRight = Math.max(...rects.map(r => r.right)) - containerRect.left;
    const currentWidth = currentRight - currentLeft;
    const currentTop = rects[0].bottom - containerRect.top;

    // Fixed cursor width - just interpolate position, not width
    let finalLeft = currentLeft;

    if (nextWordElements.length > 0 && words[activeWordIndex + 1]) {
      const nextWord = words[activeWordIndex + 1];
      const nextRects = nextWordElements.map(el => el.getBoundingClientRect());
      
      const nextLeft = Math.min(...nextRects.map(r => r.left)) - containerRect.left;

      // Calculate progress through current word (0 to 1)
      const wordDuration = nextWord.time - currentWord.time;
      const elapsed = currentTimeSec - currentWord.time;
      const progress = wordDuration > 0 ? Math.min(Math.max(elapsed / wordDuration, 0), 1) : 0;

      // Smooth interpolation - position only
      finalLeft = currentLeft + (nextLeft - currentLeft) * progress;
    }

    cursorRef.current.style.left = `${finalLeft}px`;
    cursorRef.current.style.width = `${currentWidth}px`;
    cursorRef.current.style.top = `${currentTop}px`;
  }, [isActive, activeWordIndex, animationStyle, currentTimeSec, words]);

  // Handle scale animation or gradient fill for non-cursor modes
  useEffect(() => {
    if (!containerRef.current || animationStyle === 'cursor') return;
    
    const container = containerRef.current;
    
    // When line becomes inactive, do nothing (preserve past state)
    if (!isActive) {
      lastProcessedWordRef.current = null;
      return;
    }
    
    // Skip if we've already processed this word (prevents re-running on same word)
    if (lastProcessedWordRef.current === activeWordIndex) return;
    
    const previousWordIndex = lastProcessedWordRef.current;
    lastProcessedWordRef.current = activeWordIndex;
    
    const spans = container.querySelectorAll('span[data-word-index]');

    // Only update spans that changed state
    spans.forEach(span => {
      const el = span as HTMLElement;
      const wordIdx = parseInt(el.getAttribute('data-word-index')!, 10);
      const originalBg = el.getAttribute('data-original-bg') || '';
      
      const isCurrent = activeWordIndex === wordIdx;
      const wasCurrent = previousWordIndex === wordIdx;
      
      // Skip if this span's state hasn't changed
      if (isCurrent === wasCurrent && el.classList.contains('bg-revealed') === (isCurrent || (activeWordIndex !== null && wordIdx < activeWordIndex))) {
        return;
      }
      
      const isPastWord = activeWordIndex !== null && wordIdx < activeWordIndex;

      // Use class-based approach instead of inline styles
      if (isPastWord || isCurrent) {
        // Reveal background for past and current words
        if (originalBg && !el.classList.contains('bg-revealed')) {
          el.style.backgroundColor = originalBg;
          el.classList.add('bg-revealed');
        }
      } else {
        // Future words - remove class and clear inline style
        if (el.classList.contains('bg-revealed')) {
          el.classList.remove('bg-revealed');
          el.style.backgroundColor = '';
        }
      }
    });
  }, [isActive, activeWordIndex, animationStyle]);

  return (
    <>
      {/* Cursor element for this line */}
      <div 
        ref={cursorRef}
        className={`lyric-word-cursor ${isActive && animationStyle === 'cursor' ? 'active' : ''}`}
      />
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: mappedHtml }} />
    </>
  );
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
  lineIndex,
  currentTimeSec
}: {
  lineText: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
  animationStyle: 'cursor' | 'scale' | 'hybrid';
  lineIndex: number;
  currentTimeSec: number;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  let wordCounter = 0;
  const parts = lineText.split(/(\s+|\S+)/g).filter(Boolean);

  // Update cursor for plain text with smooth interpolation
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

    const currentLeft = spanRect.left - containerRect.left;
    const currentTop = spanRect.bottom - containerRect.top;
    const currentWidth = spanRect.width;

    // Fixed width - only interpolate position
    let finalLeft = currentLeft;

    const nextSpan = Array.from(wordSpans).find(span => {
      return parseInt((span as HTMLElement).getAttribute('data-word-idx')!, 10) === activeWordIndex + 1;
    }) as HTMLElement;

    if (nextSpan && words[activeWordIndex] && words[activeWordIndex + 1]) {
      const currentWord = words[activeWordIndex];
      const nextWord = words[activeWordIndex + 1];
      const nextRect = nextSpan.getBoundingClientRect();
      
      const nextLeft = nextRect.left - containerRect.left;

      // Calculate progress
      const wordDuration = nextWord.time - currentWord.time;
      const elapsed = currentTimeSec - currentWord.time;
      const progress = wordDuration > 0 ? Math.min(Math.max(elapsed / wordDuration, 0), 1) : 0;

      // Interpolate position only
      finalLeft = currentLeft + (nextLeft - currentLeft) * progress;
    }

    cursorRef.current.style.left = `${finalLeft}px`;
    cursorRef.current.style.width = `${currentWidth}px`;
    cursorRef.current.style.top = `${currentTop}px`;
  }, [isActive, activeWordIndex, animationStyle, currentTimeSec, words]);

  return (
    <>
      {/* Cursor element for this line */}
      <div 
        ref={cursorRef}
        className={`lyric-word-cursor ${isActive && animationStyle === 'cursor' ? 'active' : ''}`}
      />
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
    </>
  );
}