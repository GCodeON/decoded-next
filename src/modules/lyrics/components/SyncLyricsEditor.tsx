'use client';
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { FaClock, FaFont } from 'react-icons/fa';
import { formatTime, generateLrc, useLyricSync, useTimestampEditor, SyncControls, generateEnhancedLrc, parseEnhancedLrc, getActiveWordIndex, type Word } from '@/modules/lyrics';
import LineEditor from  './sync-editor/LineEditor';
import WordEditor from './sync-editor/WordEditor';

interface Props {
  plainLyrics: string;
  existingLrc?: string | null;
  existingWordLrc?: string | null;
  currentPosition: number;
  currentPositionMs?: number;
  isPlaying: boolean;
  togglePlayback: () => void;
  onSave: (lrc: string) => void;
  onSaveWordSync?: (wordLrc: string) => void;
  onCancel: () => void;
  initialActiveLine?: number | null;
}

export default function SyncLyricsEditor({
  plainLyrics,
  existingLrc,
  existingWordLrc,
  currentPosition,
  currentPositionMs,
  isPlaying,
  togglePlayback,
  onSave,
  onSaveWordSync,
  onCancel,
  initialActiveLine
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wordTimingMode, setWordTimingMode] = useState(false);
  const [wordTimestamps, setWordTimestamps] = useState<Map<number, Word[]>>(new Map());
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // Load existing word timestamps from existingWordLrc
  useEffect(() => {
    if (existingWordLrc) {
      try {
        const parsed = parseEnhancedLrc(existingWordLrc);
        const wordMap = new Map<number, Word[]>();
        
        parsed.lines.forEach((timedLine, index) => {
          if (timedLine.words && timedLine.words.length > 0) {
            wordMap.set(index, timedLine.words);
          }
        });
        
        setWordTimestamps(wordMap);
      } catch (error) {
        console.error('Failed to parse existing word-synced LRC:', error);
      }
    }
  }, [existingWordLrc]);

  // Sync state - shared between line and word modes
  const { lines, timestamps, setTimestamps, allStamped, activeLine } = useLyricSync({
    plainLyrics,
    existingLrc,
    currentPosition,
    currentPositionMs,
    isPlaying,
    autoScroll: true, // Enables activeLine tracking during playback
    debug: false
  });

  // Timestamp editing - shared
  const {
    editingIndex,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit
  } = useTimestampEditor();

  // Navigation state - shared
  const [manualLineOverride, setManualLineOverride] = useState<number | null>(null);
  const [manualNavigation, setManualNavigation] = useState(false);

  // Always force navigation to initialActiveLine when it changes (e.g., editor opened repeatedly)
  useEffect(() => {
    if (typeof initialActiveLine === 'number' && initialActiveLine >= 0) {
      setManualLineOverride(initialActiveLine);
      setManualNavigation(true);
      setCurrentWordIndex(0);
      didMount.current = false; // Reset didMount so that the next effect doesn't run as if it's a remount
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActiveLine]);

  // When toggling wordTimingMode, also reset navigation to initialActiveLine if provided
  useEffect(() => {
    if (typeof initialActiveLine === 'number' && initialActiveLine >= 0) {
      setManualLineOverride(initialActiveLine);
      setManualNavigation(true);
      setCurrentWordIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordTimingMode]);
  const lastAutoLineRef = useRef<number | null>(null);

  // Current line computation - prioritizes activeLine during playback when auto-scroll is enabled
  const currentLine = useMemo(() => {
    // If auto-scroll is enabled (manualNavigation false), follow activeLine during playback
    if (!manualNavigation && isPlaying && activeLine !== null) {
      return activeLine;
    }
    // If in manual navigation mode, use manual override
    if (manualNavigation && manualLineOverride !== null) {
      return manualLineOverride;
    }
    // Default fallback
    if (activeLine !== null) return activeLine;
    return 0;
  }, [manualNavigation, isPlaying, activeLine, manualLineOverride]);

  // Remove effect that disables auto-scroll on mount or mode switch.
  // Auto-scroll is enabled by default; manualNavigation is only set to true on explicit user action.

  // Update manual override to sync with activeLine when auto-scroll is enabled
  useEffect(() => {
    if (!manualNavigation && activeLine !== null && editingIndex === null) {
      setManualLineOverride(activeLine);
    }
  }, [activeLine, manualNavigation, editingIndex]);
  // Track last auto-followed line during playback
  useEffect(() => {
    if (isPlaying && !manualNavigation && activeLine !== null) {
      lastAutoLineRef.current = activeLine;
    }
  }, [isPlaying, manualNavigation, activeLine]);

  // Only set manualNavigation to true after initial mount, not on first load
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    // Remove logic that disables auto-scroll after mount, since we now always want to use initialActiveLine
  }, [isPlaying, manualNavigation, activeLine, manualLineOverride]);

  const goBack = useCallback(() => {
    setManualLineOverride(prev => Math.max(0, (prev ?? currentLine) - 1));
  }, [currentLine]);

  const goNext = useCallback(() => {
    setManualLineOverride(prev => Math.min(lines.length - 1, (prev ?? currentLine) + 1));
  }, [lines.length, currentLine]);

  const goToLine = useCallback((index: number) => {
    setManualLineOverride(index);
    setManualNavigation(true);
    setCurrentWordIndex(0);
  }, []);

  const enableAutoScroll = useCallback(() => {
    setManualNavigation(false);
    if (activeLine !== null) {
      setManualLineOverride(activeLine);
    }
  }, [activeLine]);

  const allStampedStatus = useMemo(() => timestamps.every(t => t !== null), [timestamps]);

  // Auto-scroll - scrolls to current line (works in both auto and manual navigation)
  useEffect(() => {
    const element = containerRef.current?.children[currentLine] as HTMLElement | undefined;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [currentLine]);

  // Force scroll to currentLine when toggling wordTimingMode
  useEffect(() => {
    const element = containerRef.current?.children[currentLine] as HTMLElement | undefined;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordTimingMode]);

  // Active word highlighting during playback in word timing mode
  useEffect(() => {
    if (!isPlaying || !wordTimingMode) return;

    const currentTimeSec =
      typeof currentPositionMs === 'number' ? currentPositionMs / 1000 : currentPosition;

    const lineWords = wordTimestamps.get(currentLine) || [];
    if (lineWords.length === 0) {
      setCurrentWordIndex(-1);
      return;
    }

    const activeWord = getActiveWordIndex(lineWords, currentTimeSec);
    setCurrentWordIndex(activeWord ?? -1);
  }, [isPlaying, wordTimingMode, currentPosition, currentPositionMs, currentLine, wordTimestamps]);


  const handleStampLine = useCallback((index: number) => {
    const ms = typeof currentPositionMs === 'number' ? currentPositionMs : currentPosition * 1000;
    const sec = Math.floor(ms / 1000);
    const lineTime = Number(sec.toFixed(2));
    
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = lineTime;
      return next;
    });

    // Auto-sync: Assign line timestamp to first word if it doesn't already have one
    setWordTimestamps(prev => {
      const newMap = new Map(prev);
      const existingWords = newMap.get(index) || [];
      
      // Only auto-assign if:
      // 1. Line has words in the map (or will create one)
      // 2. First word doesn't already have a timestamp (preserve manual edits)
      if (existingWords.length === 0 && lines[index]?.trim()) {
        const lineText = lines[index].trim();
        const firstWordMatch = lineText.match(/\S+/);
        
        if (firstWordMatch) {
          const firstWord: Word = {
            text: firstWordMatch[0],
            time: lineTime,
            start: 0,
            end: firstWordMatch[0].length
          };
          newMap.set(index, [firstWord]);
        }
      } else if (existingWords.length > 0) {

        const lineText = lines[index]?.trim() || '';
        const firstWordMatch = lineText.match(/\S+/);
        
        if (firstWordMatch) {
          const firstWordInTimestamps = existingWords[0];
          
          if (firstWordInTimestamps && !firstWordInTimestamps.time) {
            const updatedWords = [...existingWords];
            updatedWords[0] = { ...firstWordInTimestamps, time: lineTime };
            newMap.set(index, updatedWords);
          }
        }
      }
      
      return newMap;
    });

    if (index === currentLine) {
      setManualLineOverride(Math.min(lines.length - 1, index + 1));
    }
    
    if (isPlaying) {
      setManualNavigation(true);
    }
  }, [currentPositionMs, currentPosition, currentLine, lines.length, setTimestamps, isPlaying, lines]);

  // Word stamping handler - word mode only (must be before keyboard shortcuts)
  const handleStampWord = useCallback((lineIndex: number, wordIndex: number, wordText: string) => {
    if (!wordText || wordText.trim().length === 0) {
      console.warn('Attempted to stamp empty word');
      return;
    }
    
    const ms = typeof currentPositionMs === 'number' ? currentPositionMs : currentPosition * 1000;
    const timeSec = Number((ms / 1000).toFixed(3));
    
    setWordTimestamps(prev => {
      const newMap = new Map(prev);
      const lineWords = newMap.get(lineIndex) || [];
      const lineText = lines[lineIndex]?.trim() || '';
      
      // Calculate character positions for the word in the line
      const wordStart = lineText.indexOf(wordText.trim());
      const wordEnd = wordStart >= 0 ? wordStart + wordText.trim().length : -1;
      
      const newWord: Word = { 
        text: wordText.trim(), 
        time: timeSec,
        start: wordStart >= 0 ? wordStart : 0,
        end: wordEnd >= 0 ? wordEnd : wordText.trim().length,
      };
      const existingIndex = lineWords.findIndex(w => w && w.text === wordText.trim());
      
      if (existingIndex !== -1) {
        const updatedWords = [...lineWords];
        updatedWords[existingIndex] = newWord;
        newMap.set(lineIndex, updatedWords);
      } else {
        const updatedWords = [...lineWords, newWord];
        // Keep words in natural line order to preserve index alignment
        newMap.set(lineIndex, updatedWords);
      }
      
      return newMap;
    });
  }, [currentPositionMs, currentPosition, lines]);

  // Save edited word time from WordEditor (keeps array in line order)
  const handleSaveWordTime = useCallback((lineIndex: number, wordIndex: number, newTime: number) => {
    const lineText = lines[lineIndex]?.trim() || '';
    const tokens = lineText ? lineText.split(/\s+/) : [];
    const targetText = tokens[wordIndex];
    if (!targetText) return;

    setWordTimestamps(prev => {
      const map = new Map(prev);
      const existing = map.get(lineIndex) || [];

      // Rebuild in line order, updating the target word’s time
      const rebuilt: Word[] = [];
      let cursor = 0;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const slice = lineText.slice(cursor);
        const rel = slice.indexOf(token);
        const start = rel >= 0 ? cursor + rel : cursor;
        const end = start + token.length;

        const match = existing.find(w => w && w.text === token);
        const time = i === wordIndex ? newTime : match?.time;
        if (time != null) {
          rebuilt.push({ text: token, time, start, end });
        }

        cursor = end;
        if (lineText[cursor] === ' ') cursor += 1;
      }

      map.set(lineIndex, rebuilt);
      return map;
    });
  }, [lines, setWordTimestamps]);

  // Keyboard shortcuts - different behavior for line vs word mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          // Space only stamps lines in line mode, not in word mode
          if (!wordTimingMode) {
            handleStampLine(currentLine);
          }
          break;
        case 'Enter':
          e.preventDefault();
          // Enter stamps words in word mode, lines in line mode
          if (wordTimingMode) {
            const currentLineText = lines[currentLine];
            const lineWords = currentLineText?.trim() ? currentLineText.trim().split(/\s+/) : [];
            if (lineWords.length > 0 && currentWordIndex < lineWords.length) {
              const wordText = lineWords[currentWordIndex];
              handleStampWord(currentLine, currentWordIndex, wordText);
              // Move to next word, or next line if at end of words
              if (currentWordIndex < lineWords.length - 1) {
                setCurrentWordIndex(currentWordIndex + 1);
              } else {
                // Move to next line and reset word index
                if (currentLine < lines.length - 1) {
                  setManualLineOverride(currentLine + 1);
                  setCurrentWordIndex(0);
                }
              }
            }
            // Disable auto-scroll when manually stamping during playback
            if (isPlaying) {
              setManualNavigation(true);
            }
          } else {
            // In line mode, Enter stamps the line
            handleStampLine(currentLine);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          goBack();
          setManualNavigation(true);
          if (wordTimingMode) setCurrentWordIndex(0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          goNext();
          setManualNavigation(true);
          if (wordTimingMode) setCurrentWordIndex(0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (wordTimingMode) {
            setCurrentWordIndex(prev => Math.max(0, prev - 1));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (wordTimingMode) {
            const currentLineText = lines[currentLine];
            const lineWords = currentLineText?.trim() ? currentLineText.trim().split(/\s+/) : [];
            setCurrentWordIndex(prev => Math.min(lineWords.length - 1, prev + 1));
          }
          break;
        case 'Escape':
          e.preventDefault();
          enableAutoScroll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLine, currentWordIndex, wordTimingMode, lines, handleStampLine, handleStampWord, goBack, goNext, enableAutoScroll, setManualLineOverride, isPlaying]);

  const handleSaveTimestamp = useCallback((index: number, value: number) => {
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, [setTimestamps]);

  const handleSave = useCallback(() => {
    // Always save line-level LRC
    const lineLrc = generateLrc(lines, timestamps);
    onSave(lineLrc);
    
    // Additionally save word-level if in word mode and callback provided
    if (wordTimingMode && wordTimestamps.size > 0 && onSaveWordSync) {
      const wordLrc = generateEnhancedLrc(lines, timestamps, wordTimestamps);
      onSaveWordSync(wordLrc);
    }
  }, [lines, timestamps, wordTimestamps, wordTimingMode, onSave, onSaveWordSync]);

  const lrc = wordTimingMode 
    ? generateEnhancedLrc(lines, timestamps, wordTimestamps)
    : generateLrc(lines, timestamps);

  return (
    <div className="space-y-6">
      <SyncControls
        isPlaying={isPlaying}
        currentPosition={currentPosition}
        togglePlayback={togglePlayback}
        allStamped={allStampedStatus}
        manualNavigation={manualNavigation}
        onEnableAutoScroll={enableAutoScroll}
      />

      {/* Word Timing Mode Toggle - only show if onSaveWordSync provided */}
      {onSaveWordSync && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <FaFont className="text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-800">Word Timing Mode</h3>
              <p className="text-sm text-gray-600">
                {wordTimingMode 
                  ? 'Press Enter to stamp each word, ← → to navigate words, ↑ ↓ for lines' 
                  : 'Enable to sync individual words (karaoke-style)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setWordTimingMode(!wordTimingMode);
              setCurrentWordIndex(0);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              wordTimingMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {wordTimingMode ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg border"
      >
        {lines.map((line, i) => {
          const time = timestamps[i];
          const isActive = i === currentLine;

          return wordTimingMode ? (
            <WordEditor
              key={i}
              line={line}
              lineIndex={i}
              time={time}
              isActive={isActive}
              editingIndex={editingIndex}
              editValue={editValue}
              wordTimestamps={wordTimestamps.get(i) || []}
              currentWordIndex={isActive ? currentWordIndex : -1}
              onStampLine={() => handleStampLine(i)}
              onStampWord={(wordIndex: number, wordText: string) => handleStampWord(i, wordIndex, wordText)}
              onGoToLine={() => goToLine(i)}
              onEditChange={setEditValue}
              onStartEdit={() => startEdit(i, formatTime(time!))}
              onSaveEdit={() => saveEdit(handleSaveTimestamp)}
              onCancelEdit={cancelEdit}
              onSaveWordTime={handleSaveWordTime}
              onDisableAutoScroll={() => {
                setManualNavigation(true);
                setManualLineOverride(i);
              }}
            />
          ) : (
            <LineEditor
              key={i}
              line={line}
              lineIndex={i}
              time={time}
              isActive={isActive}
              editingIndex={editingIndex}
              editValue={editValue}
              onStampLine={() => handleStampLine(i)}
              onGoToLine={() => goToLine(i)}
              onEditChange={setEditValue}
              onStartEdit={() => startEdit(i, formatTime(time!))}
              onSaveEdit={() => saveEdit(handleSaveTimestamp)}
              onCancelEdit={cancelEdit}
              onDisableAutoScroll={() => {
                setManualNavigation(true);
                setManualLineOverride(i);
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={!allStampedStatus}
          className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {wordTimingMode ? 'Save Word-Synced Lyrics' : 'Save Synced Lyrics'}
        </button>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-900">
          Cancel
        </button>
      </div>

      {lrc && (
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            Preview LRC Output {wordTimingMode && '(Enhanced Format)'}
          </summary>
          <pre className="mt-3 p-4 bg-gray-900 text-gray-300 text-xs font-mono rounded overflow-x-auto">
            {lrc}
          </pre>
        </details>
      )}
    </div>
  );
}
