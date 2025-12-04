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
  const revealedElementsRef = useRef<Set<HTMLElement>>(new Set());

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

  // Color reveal effect for cursor mode - timing-based progressive reveal
  useEffect(() => {
    if (!containerRef.current || animationStyle !== 'cursor') return;
    
    const container = containerRef.current;
    
    // For past lines, mark all colored elements as past
    if (isPast) {
      const coloredElements = container.querySelectorAll('[data-original-bg]');
      coloredElements.forEach(el => {
        el.setAttribute('data-word-state', 'past');
      });
      return;
    }
    
    // For active lines, update word state based on timing
    if (!isActive) return;

    const coloredElements = container.querySelectorAll('[data-original-bg]');
    
    coloredElements.forEach(el => {
      const bg = el.getAttribute('data-original-bg');
      if (!bg) return;
      
      // Get the word index
      let targetWordIdx: number | null = null;
      
      const wordIdx = el.getAttribute('data-word-index');
      if (wordIdx) {
        targetWordIdx = parseInt(wordIdx, 10);
      } else {
        // Get from first child span with data-word-index
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
      
      // Set word state and apply color based on current time vs word time
      if (currentTimeSec >= word.time) {
        el.setAttribute('data-word-state', 'past');
        (el as HTMLElement).style.backgroundColor = bg;
      } else {
        el.setAttribute('data-word-state', 'future');
        (el as HTMLElement).style.backgroundColor = '';
      }
    });
  }, [isActive, isPast, animationStyle, currentTimeSec, words]);

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
    if (!isActive || words.length === 0) return;

    // Calculate local active word index based on current time and word timings
    // Find the last word whose time is <= currentTimeSec
    let localActiveWordIndex = -1;
    for (let i = words.length - 1; i >= 0; i--) {
      if (currentTimeSec >= words[i].time) {
        localActiveWordIndex = i;
        break;
      }
    }

    if (localActiveWordIndex < 0) return;

    const wordSpans = containerRef.current.querySelectorAll('span[data-word-idx]');
    const currentSpan = Array.from(wordSpans).find(span => {
      return parseInt((span as HTMLElement).getAttribute('data-word-idx')!, 10) === localActiveWordIndex;
    }) as HTMLElement;

    if (!currentSpan) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const spanRect = currentSpan.getBoundingClientRect();

    const currentLeft = spanRect.left - containerRect.left;
    const currentTop = spanRect.bottom - containerRect.top;
    const currentWidth = spanRect.width;

    // Fixed width - only interpolate position
    let finalLeft = currentLeft;

    // Try to interpolate to next word if it exists
    if (localActiveWordIndex + 1 < words.length) {
      const nextSpan = Array.from(wordSpans).find(span => {
        return parseInt((span as HTMLElement).getAttribute('data-word-idx')!, 10) === localActiveWordIndex + 1;
      }) as HTMLElement;

      if (nextSpan) {
        const currentWord = words[localActiveWordIndex];
        const nextWord = words[localActiveWordIndex + 1];
        const nextRect = nextSpan.getBoundingClientRect();
        
        const nextLeft = nextRect.left - containerRect.left;

        // Calculate progress through current word
        const wordDuration = nextWord.time - currentWord.time;
        const elapsed = currentTimeSec - currentWord.time;
        const progress = wordDuration > 0 ? Math.min(Math.max(elapsed / wordDuration, 0), 1) : 0;

        // Interpolate position only
        finalLeft = currentLeft + (nextLeft - currentLeft) * progress;
      }
    }

    cursorRef.current.style.left = `${finalLeft}px`;
    cursorRef.current.style.width = `${currentWidth}px`;
    cursorRef.current.style.top = `${currentTop}px`;
  }, [isActive, animationStyle, currentTimeSec, words]);

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