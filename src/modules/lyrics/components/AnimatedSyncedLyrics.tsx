'use client';
import { useRef, useEffect, useState, useMemo } from 'react';
import { FaPalette } from 'react-icons/fa';
import { useLyricSync } from '@/modules/lyrics';
import { parseEnhancedLrc, getActiveWordIndex, splitLineIntoSegments, type Word } from '@/modules/lyrics/utils/lrcAdvanced';

interface AnimatedSyncedLyricsProps {
  wordSyncedLyrics: string;
  currentPosition: number;
  currentPositionMs: number;
  isPlaying: boolean;
  rhymeEncodedLines?: string[];
}

export default function AnimatedSyncedLyrics({
  wordSyncedLyrics,
  currentPosition,
  currentPositionMs,
  isPlaying,
  rhymeEncodedLines
}: AnimatedSyncedLyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showRhymes, setShowRhymes] = useState(true);

  // Parse enhanced LRC
  const parsedLrc = useMemo(() => {
    return parseEnhancedLrc(wordSyncedLyrics);
  }, [wordSyncedLyrics]);

  // Use line-level sync to determine active line
  const { activeLine } = useLyricSync({
    plainLyrics: '',
    existingLrc: wordSyncedLyrics,
    currentPosition,
    currentPositionMs,
    isPlaying,
    autoScroll: true,
    debug: false
  });

  // Retain last active line while paused
  const lastActiveLineRef = useRef<number | null>(null);
  const effectiveActiveLine = isPlaying ? activeLine : (lastActiveLineRef.current ?? activeLine);

  useEffect(() => {
    if (activeLine !== null && isPlaying) {
      lastActiveLineRef.current = activeLine;
    }
  }, [activeLine, isPlaying]);

  // Auto-scroll to active line
  useEffect(() => {
    if (effectiveActiveLine === null) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const targetElement = Array.from(container.children)[effectiveActiveLine] as HTMLElement | undefined;
    
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [effectiveActiveLine]);

  const htmlIsVisuallyEmpty = (html?: string): boolean => {
    if (!html) return true;
    const stripped = html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    return stripped.length === 0;
  };

  // Calculate current time in seconds for word highlighting
  const currentTimeSec = currentPositionMs / 1000;

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowRhymes(!showRhymes)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md ${
            showRhymes
              ? 'bg-gradient-to-r from-green-100 to-white-500 text-black'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaPalette className={showRhymes ? 'animate-pulse' : ''} />
          {showRhymes ? 'Rhymes ON' : 'Show Rhyme Colors'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto bg-gray-50 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
      >
        {parsedLrc.lines.map((line, i) => {
          const isActive = i === effectiveActiveLine;
          const lineText = line.text.trim();
          
          // For empty lines, always show as instrumental
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

          const rhymeHtml = rhymeEncodedLines?.[i];
          const showRhymeContent = showRhymes && rhymeHtml && !htmlIsVisuallyEmpty(rhymeHtml);
          const hasWordTiming = line.words.length > 0;

          // Determine active word index for this line
          const activeWordIndex = isActive && hasWordTiming 
            ? getActiveWordIndex(line.words, currentTimeSec)
            : null;

          return (
            <div
              key={i}
              className={`synced-line px-2 py-2 rounded-lg shadow-sm transition-all duration-400 text-black text-md md:text-xl font-medium ${
                isActive ? 'bg-yellow-100 scale-101' : 'bg-white'
              }`}
            >
              {showRhymeContent && hasWordTiming ? (
                <RhymeEncodedWordSync
                  rhymeHtml={rhymeHtml}
                  words={line.words}
                  activeWordIndex={activeWordIndex}
                  isActive={isActive}
                />
              ) : hasWordTiming ? (
                <PlainWordSync
                  lineText={lineText}
                  words={line.words}
                  activeWordIndex={activeWordIndex}
                  isActive={isActive}
                />
              ) : showRhymeContent ? (
                <div dangerouslySetInnerHTML={{ __html: rhymeHtml }} />
              ) : (
                <span>{lineText}</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Component for rendering rhyme-encoded HTML with word-level sync
function RhymeEncodedWordSync({
  rhymeHtml,
  words,
  activeWordIndex,
  isActive
}: {
  rhymeHtml: string;
  words: Word[];
  activeWordIndex: number | null;
  isActive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse rhyme HTML and map spans to word indices
  const enhancedHtml = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rhymeHtml, 'text/html');
    const spans = doc.querySelectorAll('span[style*="background-color"]');
    
    // Create a flat list of all text content to match against words
    let wordIdx = 0;
    const wordTexts = words.map(w => w.text.toLowerCase().trim());
    
    spans.forEach((span, spanIdx) => {
      const spanText = span.textContent?.trim().toLowerCase() || '';
      if (!spanText) {
        span.setAttribute('data-span-index', spanIdx.toString());
        span.setAttribute('data-empty', 'true');
        return;
      }
      
      // Match span text to next word in sequence
      if (wordIdx < words.length) {
        const currentWord = wordTexts[wordIdx];
        
        // Check various matching conditions
        if (spanText === currentWord || 
            spanText.includes(currentWord) || 
            currentWord.includes(spanText) ||
            spanText.replace(/[^a-z]/g, '') === currentWord.replace(/[^a-z]/g, '')) {
          span.setAttribute('data-word-index', wordIdx.toString());
          span.setAttribute('data-span-index', spanIdx.toString());
          wordIdx++;
        } else {
          // Doesn't match - might be punctuation or whitespace span
          span.setAttribute('data-span-index', spanIdx.toString());
          span.setAttribute('data-unmatched', 'true');
        }
      } else {
        span.setAttribute('data-span-index', spanIdx.toString());
        span.setAttribute('data-overflow', 'true');
      }
    });

    return doc.body.innerHTML;
  }, [rhymeHtml, words]);

  // Apply progressive reveal and animation based on active word
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const spans = container.querySelectorAll('span[data-span-index]');
    
    spans.forEach((span) => {
      const spanEl = span as HTMLElement;
      const wordIdxAttr = spanEl.getAttribute('data-word-index');
      const isEmpty = spanEl.getAttribute('data-empty') === 'true';
      const isUnmatched = spanEl.getAttribute('data-unmatched') === 'true';
      const isOverflow = spanEl.getAttribute('data-overflow') === 'true';
      
      // Handle non-word spans (punctuation, whitespace)
      if (isEmpty || isUnmatched || isOverflow) {
        if (!isActive) {
          spanEl.style.opacity = '0';
        } else if (activeWordIndex === null) {
          spanEl.style.opacity = '0';
        } else {
          // Show these when line is active and has started
          spanEl.style.opacity = '0.5';
        }
        spanEl.style.transition = 'opacity 0.2s ease-in-out';
        return;
      }
      
      // Handle word-matched spans
      if (wordIdxAttr !== null) {
        const wordIndex = parseInt(wordIdxAttr);
        
        if (!isActive) {
          // Line not active: hide completely
          spanEl.style.opacity = '0';
          spanEl.style.transform = 'scale(0.98)';
          spanEl.style.filter = 'brightness(1)';
          spanEl.style.transition = 'all 0.2s ease-out';
        } else if (activeWordIndex === null) {
          // Line active but no word yet: hide all
          spanEl.style.opacity = '0';
          spanEl.style.transform = 'scale(0.98)';
          spanEl.style.filter = 'brightness(1)';
          spanEl.style.transition = 'all 0.2s ease-out';
        } else if (wordIndex < activeWordIndex) {
          // Past words: fully visible with original color
          spanEl.style.opacity = '1';
          spanEl.style.transform = 'scale(1)';
          spanEl.style.filter = 'brightness(1)';
          spanEl.style.transition = 'all 0.2s ease-in';
        } else if (wordIndex === activeWordIndex) {
          // Current word: pop with brightness boost
          spanEl.style.opacity = '1';
          spanEl.style.transform = 'scale(1.08)';
          spanEl.style.filter = 'brightness(1.4)';
          spanEl.style.transition = 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        } else {
          // Future words: completely hidden
          spanEl.style.opacity = '0';
          spanEl.style.transform = 'scale(0.98)';
          spanEl.style.filter = 'brightness(1)';
          spanEl.style.transition = 'all 0.15s ease-out';
        }
      }
    });
  }, [activeWordIndex, isActive]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: enhancedHtml }} />;
}

// Component for rendering plain text with word-level karaoke sync
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
  const segments = useMemo(() => {
    return splitLineIntoSegments(lineText, words);
  }, [lineText, words]);

  let wordCounter = 0;

  return (
    <span>
      {segments.map((segment, idx) => {
        if (!segment.isWord) {
          return <span key={idx}>{segment.text}</span>;
        }

        const currentWordIdx = wordCounter++;
        const isHighlighted = isActive && activeWordIndex !== null && currentWordIdx <= activeWordIndex;

        return (
          <span
            key={idx}
            className="transition-all duration-150"
            style={{
              backgroundColor: isHighlighted ? 'rgba(34, 197, 94, 0.4)' : 'transparent',
              padding: '0 2px',
              borderRadius: '3px'
            }}
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}
