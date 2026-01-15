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

  const { lines, timestamps, setTimestamps, allStamped, activeLine } = useLyricSync({
    plainLyrics,
    existingLrc,
    currentPosition,
    currentPositionMs,
    isPlaying,
    autoScroll: true
  });

  const {
    editingIndex,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit
  } = useTimestampEditor();

  const [manualLineOverride, setManualLineOverride] = useState<number | null>(null);
  const [manualNavigation, setManualNavigation] = useState(false);

  useEffect(() => {
    if (typeof initialActiveLine === 'number' && initialActiveLine >= 0) {
      setManualLineOverride(initialActiveLine);
      setManualNavigation(true);
      setCurrentWordIndex(0);
      didMount.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActiveLine]);

  useEffect(() => {
    if (typeof initialActiveLine === 'number' && initialActiveLine >= 0) {
      setManualLineOverride(initialActiveLine);
      setManualNavigation(true);
      setCurrentWordIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordTimingMode]);
  const lastAutoLineRef = useRef<number | null>(null);


  const currentLine = useMemo(() => {
    if (!manualNavigation && isPlaying && activeLine !== null) {
      return activeLine;
    }
    if (manualNavigation && manualLineOverride !== null) {
      return manualLineOverride;
    }
    if (activeLine !== null) return activeLine;
    return 0;
  }, [manualNavigation, isPlaying, activeLine, manualLineOverride]);

  useEffect(() => {
    if (!manualNavigation && activeLine !== null && editingIndex === null) {
      setManualLineOverride(activeLine);
    }
  }, [activeLine, manualNavigation, editingIndex]);

  useEffect(() => {
    if (isPlaying && !manualNavigation && activeLine !== null) {
      lastAutoLineRef.current = activeLine;
    }
  }, [isPlaying, manualNavigation, activeLine]);


  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

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

  useEffect(() => {
    const element = containerRef.current?.children[currentLine] as HTMLElement | undefined;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [currentLine]);

  useEffect(() => {
    const element = containerRef.current?.children[currentLine] as HTMLElement | undefined;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordTimingMode]);

  useEffect(() => {
    if (!isPlaying || !wordTimingMode || manualNavigation) return;

    const lineWords = wordTimestamps.get(currentLine) || [];
    
    // Only auto-highlight if all words in the current line are stamped
    const allWordsStamped = lineWords.length > 0 && lineWords.every(w => w && w.time != null);
    if (!allWordsStamped) {
      return;
    }

    const currentTimeSec =
      typeof currentPositionMs === 'number' ? currentPositionMs / 1000 : currentPosition;

    const activeWord = getActiveWordIndex(lineWords, currentTimeSec);
    setCurrentWordIndex(activeWord ?? -1);
  }, [isPlaying, wordTimingMode, manualNavigation, currentPosition, currentPositionMs, currentLine, wordTimestamps]);


  const handleStampLine = useCallback((index: number) => {
    const ms = typeof currentPositionMs === 'number' ? currentPositionMs : currentPosition * 1000;
    const sec = Math.floor(ms / 1000);
    const lineTime = Number(sec.toFixed(2));
    
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = lineTime;
      return next;
    });

    setWordTimestamps(prev => {
      const newMap = new Map(prev);
      const existingWords = newMap.get(index) || [];
      
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
      const tokens = lineText ? lineText.split(/\s+/) : [];
      
      // Calculate start/end positions based on wordIndex, not text matching
      let cursor = 0;
      let wordStart = 0;
      let wordEnd = 0;
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const slice = lineText.slice(cursor);
        const rel = slice.indexOf(token);
        wordStart = rel >= 0 ? cursor + rel : cursor;
        wordEnd = wordStart + token.length;
        
        if (i === wordIndex) {
          break;
        }
        cursor = wordEnd + 1; // +1 for space
      }
      
      const newWord: Word = { 
        text: wordText.trim(), 
        time: timeSec,
        start: wordStart,
        end: wordEnd,
      };
      
      // Find existing word at this specific position (not by text match)
      const existingIndex = lineWords.findIndex(w => w && w.start === wordStart && w.end === wordEnd);
      
      if (existingIndex !== -1) {
        const updatedWords = [...lineWords];
        updatedWords[existingIndex] = newWord;
        newMap.set(lineIndex, updatedWords);
      } else {
        const updatedWords = [...lineWords, newWord];
        newMap.set(lineIndex, updatedWords);
      }
      
      return newMap;
    });
  }, [currentPositionMs, currentPosition, lines]);

  const handleSaveWordTime = useCallback((lineIndex: number, wordIndex: number, newTime: number) => {
    const lineText = lines[lineIndex]?.trim() || '';
    const tokens = lineText ? lineText.split(/\s+/) : [];
    const targetText = tokens[wordIndex];
    if (!targetText) return;

    setWordTimestamps(prev => {
      const map = new Map(prev);
      const existing = map.get(lineIndex) || [];

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

  const handleClearAllWordTimestamps = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all word timestamps?')) {
      setWordTimestamps(new Map());
    }
  }, []);

  const handleClearLineWordTimestamps = useCallback(() => {
    if (window.confirm(`Are you sure you want to clear word timestamps for this line?`)) {
      setWordTimestamps(prev => {
        const newMap = new Map(prev);
        newMap.delete(currentLine);
        return newMap;
      });
    }
  }, [currentLine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (!wordTimingMode) {
            handleStampLine(currentLine);
          }
          break;
        case 'Enter':
          e.preventDefault();

          if (wordTimingMode) {
            const currentLineText = lines[currentLine];
            const lineWords = currentLineText?.trim() ? currentLineText.trim().split(/\s+/) : [];
            if (lineWords.length > 0 && currentWordIndex < lineWords.length) {
              const wordText = lineWords[currentWordIndex];
              handleStampWord(currentLine, currentWordIndex, wordText);

              if (currentWordIndex < lineWords.length - 1) {
                setCurrentWordIndex(currentWordIndex + 1);
              } else {

                if (currentLine < lines.length - 1) {
                  setManualLineOverride(currentLine + 1);
                  setCurrentWordIndex(0);
                }
              }
            }

            if (isPlaying) {
              setManualNavigation(true);
            }
          } else {
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
    const lineLrc = generateLrc(lines, timestamps);
    onSave(lineLrc);
    
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

      {/* Word Timing Mode Toggle */}
      {onSaveWordSync && (
        <div className="space-y-4">
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

          {/* Clear Word Timestamps Buttons */}
          {wordTimingMode && wordTimestamps.size > 0 && (
            <div className="flex gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <button
                onClick={handleClearLineWordTimestamps}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold"
              >
                Clear Current Line
              </button>
              <button
                onClick={handleClearAllWordTimestamps}
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all text-sm font-semibold"
              >
                Clear All Timestamps
              </button>
            </div>
          )}
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
