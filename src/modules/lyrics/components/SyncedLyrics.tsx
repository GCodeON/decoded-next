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
  animationStyle = 'hybrid' 
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
      className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-zinc-900 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
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
                className={`synced-line px-6 py-3 text-center text-gray-500 italic text-sm ${
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
              className={`synced-line relative px-6 py-3 rounded-lg transition-all duration-300 text-black dark:text-white text-lg md:text-xl font-medium leading-relaxed ${
                isActive ? 'active-line bg-blue-100/60 dark:bg-blue-900/30' : 
                isPast ? 'past-line opacity-90' : 'opacity-50'
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

  const mappedHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(rhymeHtml, 'text/html');
    
    // Get the plain text content
    const fullText = doc.body.textContent || '';
    
    // Build a map of which character positions belong to which words
    const charToWordIndex: (number | null)[] = new Array(fullText.length).fill(null);
    
    // Match words sequentially in order (avoids duplicate matches)
    let searchPos = 0;
    words.forEach((word, wordIdx) => {
      // Normalize the word for matching (remove punctuation for comparison)
      const normalizedWord = word.text.toLowerCase().replace(/[^\w']/g, '');
      if (!normalizedWord) return;
      
      // Find this word starting from current position
      const textSlice = fullText.slice(searchPos).toLowerCase();
      const matchIdx = textSlice.search(new RegExp(`\\b${normalizedWord}\\b|${normalizedWord}`));
      
      if (matchIdx !== -1) {
        const actualPos = searchPos + matchIdx;
        
        // Mark all character positions for this word
        for (let i = 0; i < normalizedWord.length; i++) {
          if (charToWordIndex[actualPos + i] === null) {
            charToWordIndex[actualPos + i] = wordIdx;
          }
        }
        
        searchPos = actualPos + normalizedWord.length;
      }
    });
    
    // Helper function to reconstruct HTML with wrapped text nodes
    const processNode = (node: Node, charIdx: { value: number }): Node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const fragment = document.createDocumentFragment();
        let currentPos = 0;
        let currentWordIdx: number | null = null;
        let chunk = '';
        
        for (let i = 0; i < text.length; i++) {
          const wordIdx = charToWordIndex[charIdx.value + i];
          
          // If word index changes, create a span for the accumulated chunk
          if (wordIdx !== currentWordIdx) {
            if (chunk) {
              const span = document.createElement('span');
              if (currentWordIdx !== null) {
                span.setAttribute('data-word-index', String(currentWordIdx));
              }
              span.textContent = chunk;
              fragment.appendChild(span);
            }
            chunk = text[i];
            currentWordIdx = wordIdx;
          } else {
            chunk += text[i];
          }
        }
        
        // Append final chunk
        if (chunk) {
          const span = document.createElement('span');
          if (currentWordIdx !== null) {
            span.setAttribute('data-word-index', String(currentWordIdx));
          }
          span.textContent = chunk;
          fragment.appendChild(span);
        }
        
        charIdx.value += text.length;
        return fragment;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const newEl = el.cloneNode(false) as HTMLElement;
        
        // Track the starting char index for this element
        const startCharIdx = charIdx.value;
        
        // Preserve styling for colored spans - check inline style and style attribute
        let bgColor: string | null = null;
        
        // Try to get background color from inline style attribute
        const styleAttr = el.getAttribute('style');
        if (styleAttr) {
          const bgMatch = styleAttr.match(/background-color\s*:\s*([^;]+)/i);
          if (bgMatch) {
            bgColor = bgMatch[1].trim();
          }
        }
        
        // Also check for background shorthand
        if (!bgColor && styleAttr) {
          const bgMatch = styleAttr.match(/background\s*:\s*([^;]+)/i);
          if (bgMatch) {
            const bg = bgMatch[1].trim();
            // Extract color if it's a valid color value
            if (bg && !bg.includes('url(') && !bg.includes('gradient')) {
              bgColor = bg.split(/\s+/)[0]; // Take first value which is usually the color
            }
          }
        }
        
        if (bgColor) {
          newEl.setAttribute('data-original-bg', bgColor);
          // Don't set backgroundColor here - let the effect control reveal timing
          // But preserve the original color for reference
        }
        
        // If this element already had a word index (from rhyme coloring), preserve it
        const existingWordIdx = el.getAttribute('data-word-index');
        if (existingWordIdx) {
          newEl.setAttribute('data-word-index', existingWordIdx);
        }
        
        // Process children
        Array.from(node.childNodes).forEach(child => {
          const processed = processNode(child, charIdx);
          if (processed.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            Array.from(processed.childNodes).forEach(c => {
              newEl.appendChild(c);
            });
          } else {
            newEl.appendChild(processed);
          }
        });
        
        // If this colored span doesn't have a word index yet, determine it from its content
        if (bgColor && !newEl.getAttribute('data-word-index')) {
          // First, try to get from any child span with data-word-index
          const firstChildWithIdx = newEl.querySelector('[data-word-index]');
          if (firstChildWithIdx) {
            const childIdx = firstChildWithIdx.getAttribute('data-word-index');
            if (childIdx) {
              newEl.setAttribute('data-word-index', childIdx);
            }
          } else {
            // Fall back to first character position
            const firstWordInSpan = charToWordIndex[startCharIdx];
            if (firstWordInSpan !== null && firstWordInSpan !== undefined) {
              newEl.setAttribute('data-word-index', String(firstWordInSpan));
            }
          }
        }
        
        return newEl;
      } else {
        return node.cloneNode(true);
      }
    };
    
    // Process the document
    const newBody = document.createElement('div');
    const charIdx = { value: 0 };
    Array.from(doc.body.childNodes).forEach(child => {
      const processed = processNode(child, charIdx);
      if (processed.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        Array.from(processed.childNodes).forEach(c => {
          newBody.appendChild(c);
        });
      } else {
        newBody.appendChild(processed);
      }
    });
    
    return newBody.innerHTML;
  }, [rhymeHtml, words, animationStyle]);

  // Update cursor position with smooth interpolation (Liricle-style)
  useEffect(() => {
    if (!containerRef.current || !cursorRef.current || animationStyle === 'scale') return;
    if (!isActive) return;

    // Calculate the active word index based on currentTimeSec (local to this line)
    let localActiveWordIndex: number | null = null;
    for (let i = words.length - 1; i >= 0; i--) {
      if (currentTimeSec >= words[i].time) {
        localActiveWordIndex = i;
        break;
      }
    }

    if (localActiveWordIndex === null) {
      // Before first word - position cursor at start of first word
      localActiveWordIndex = 0;
    }

    // Get ALL elements/text that make up the current word (including spaces, punctuation, etc.)
    const allElements = containerRef.current.querySelectorAll('span');
    const currentWordElements: HTMLElement[] = [];
    const nextWordElements: HTMLElement[] = [];
    
    allElements.forEach(el => {
      const wordIdx = el.getAttribute('data-word-index');
      if (wordIdx !== null) {
        const idx = parseInt(wordIdx, 10);
        if (idx === localActiveWordIndex) {
          currentWordElements.push(el);
        } else if (idx === localActiveWordIndex + 1) {
          nextWordElements.push(el);
        }
      }
    });

    if (currentWordElements.length === 0) return;

    // Get current word timing
    const currentWord = words[localActiveWordIndex];
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

    if (nextWordElements.length > 0 && words[localActiveWordIndex + 1]) {
      const nextWord = words[localActiveWordIndex + 1];
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
  }, [isActive, animationStyle, currentTimeSec, words]);

  // Color reveal effect - unified for all animation styles
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const coloredElements = container.querySelectorAll('[data-original-bg]');
    
    // For past lines, reveal all colors immediately
    if (isPast) {
      coloredElements.forEach(el => {
        const bg = el.getAttribute('data-original-bg');
        if (bg) {
          el.setAttribute('data-word-state', 'past');
          (el as HTMLElement).style.backgroundColor = bg;
        }
      });
      return;
    }
    
    // For active lines, update word state based on timing
    if (!isActive) return;

    coloredElements.forEach(el => {
      const bg = el.getAttribute('data-original-bg');
      if (!bg) return;
      
      // Get the word index for this colored element
      let targetWordIdx: number | null = null;
      
      const wordIdx = el.getAttribute('data-word-index');
      if (wordIdx) {
        targetWordIdx = parseInt(wordIdx, 10);
      } else {
        // Fallback: get from first child span with data-word-index
        const allChildSpans = el.querySelectorAll('[data-word-index]');
        if (allChildSpans.length > 0) {
          const firstIdx = allChildSpans[0].getAttribute('data-word-index');
          if (firstIdx) {
            targetWordIdx = parseInt(firstIdx, 10);
          }
        }
      }
      
      if (targetWordIdx === null) return;
      
      const word = words[targetWordIdx];
      if (!word) return;
      
      // Progressive reveal: apply color when word time is reached
      if (currentTimeSec >= word.time) {
        el.setAttribute('data-word-state', 'past');
        (el as HTMLElement).style.backgroundColor = bg;
      } else {
        el.setAttribute('data-word-state', 'future');
        (el as HTMLElement).style.backgroundColor = '';
      }
    });
  }, [isActive, isPast, currentTimeSec, words]);

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
  isActive,
  isNext,
  isPrev,
  currentTimeSec,
  animationStyle,
}: any) {
  const filledUpTo = words.findIndex(w => currentTimeSec < w.time);
  const filledWords = filledUpTo === -1 ? words.length : filledUpTo;

  return (
    <div
      className={`transition-all duration-700 leading-relaxed ${
        isActive
          ? 'text-3md  font-bold drop-shadow-2xl'
          : isPrev || isNext
          ? 'text-2md font-medium text-gray-500'
          : 'text-1md  text-gray-700 opacity-30'
      }`}
      style={{ textShadow: isActive ? '0 0 30px rgba(0,0,0,0.8)' : undefined }}
    >
      {lineText.split(/(\s+)/).map((part: string, i: number) => {
        if (/\s/.test(part)) return part;
        const wordIndex = Math.floor(i / 2);
        const isFilled = isActive && wordIndex < filledWords;
        return (
          <span
            key={i}
            style={{
              background: isFilled
                ? 'linear-gradient(90deg, #29e2f6ff, #b0e9faff)'
                : undefined,
              backgroundClip: isFilled ? 'text' : undefined,
              WebkitBackgroundClip: isFilled ? 'text' : undefined,
              color: isFilled ? 'transparent' : (isActive ? 'white' : 'rgba(255,255,255,0.5)'),
              transition: 'all 0.2s ease',
            }}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
}