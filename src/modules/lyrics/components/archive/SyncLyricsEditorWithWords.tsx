'use client';
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { FaClock, FaFont } from 'react-icons/fa';
import { 
  formatTime, 
  generateLrc, 
  useLyricSync, 
  useTimestampEditor, 
  TimestampDisplay, 
  SyncControls
} from '@/modules/lyrics';
import { generateEnhancedLrc, type Word } from '@/modules/lyrics/utils/lrcAdvanced';

interface Props {
  plainLyrics: string;
  existingLrc?: string | null;
  existingWordLrc?: string | null;
  currentPosition: number;
  currentPositionMs?: number;
  isPlaying: boolean;
  togglePlayback: () => void;
  onSave: (lrc: string) => void;
  onSaveWordSync: (wordLrc: string) => void;
  onCancel: () => void;
}

export default function SyncLyricsEditorWithWords({
  plainLyrics,
  existingLrc,
  existingWordLrc,
  currentPosition,
  currentPositionMs,
  isPlaying,
  togglePlayback,
  onSave,
  onSaveWordSync,
  onCancel
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wordTimingMode, setWordTimingMode] = useState(false);
  
  // Word timestamps: Map<lineIndex, Word[]>
  const [wordTimestamps, setWordTimestamps] = useState<Map<number, Word[]>>(new Map());

  // Sync state - autoScroll true so we get activeLine for auto-follow
  const { lines, timestamps, setTimestamps, allStamped, activeLine } = useLyricSync({
    plainLyrics,
    existingLrc,
    currentPosition,
    currentPositionMs,
    isPlaying,
    autoScroll: true,
    debug: true
  });

  // Timestamp editing
  const {
    editingIndex,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit
  } = useTimestampEditor();

  // Manual navigation state
  const [manualLineOverride, setManualLineOverride] = useState<number | null>(null);
  const [manualNavigation, setManualNavigation] = useState(false);

  // Compute currentLine synchronously
  const currentLine = useMemo(() => {
    if (!isPlaying && manualLineOverride !== null) return manualLineOverride;
    if (activeLine !== null) return activeLine;
    return 0;
  }, [manualLineOverride, activeLine, isPlaying]);

  // Update manual override when activeLine changes
  useEffect(() => {
    if (activeLine !== null && !manualNavigation && editingIndex === null) {
      setManualLineOverride(activeLine);
    }
  }, [activeLine, manualNavigation, editingIndex]);

  // Navigation callbacks
  const goBack = useCallback(() => {
    setManualLineOverride(prev => Math.max(0, (prev ?? currentLine) - 1));
  }, [currentLine]);

  const goNext = useCallback(() => {
    setManualLineOverride(prev => Math.min(lines.length - 1, (prev ?? currentLine) + 1));
  }, [lines.length, currentLine]);

  const goToLine = useCallback((index: number) => {
    setManualLineOverride(index);
    setManualNavigation(true);
  }, []);

  const enableAutoScroll = useCallback(() => {
    setManualNavigation(false);
    if (activeLine !== null) {
      setManualLineOverride(activeLine);
    }
  }, [activeLine]);

  const allStampedStatus = useMemo(() => timestamps.every(t => t !== null), [timestamps]);

  // Auto-scroll to current line
  useEffect(() => {
    const element = containerRef.current?.children[currentLine] as HTMLElement | undefined;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [currentLine]);

  // Handlers
  const handleStampLine = useCallback((index: number) => {
    const ms = typeof currentPositionMs === 'number' ? currentPositionMs : currentPosition * 1000;
    const sec = Math.floor(ms / 1000);
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = Number(sec.toFixed(2));
      return next;
    });
    if (index === currentLine) {
      setManualLineOverride(Math.min(lines.length - 1, index + 1));
    }
  }, [currentPositionMs, currentPosition, currentLine, lines.length, setTimestamps]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleStampLine(currentLine);
          break;
        case 'ArrowUp':
          e.preventDefault();
          goBack();
          setManualNavigation(true);
          break;
        case 'ArrowDown':
          e.preventDefault();
          goNext();
          setManualNavigation(true);
          break;
        case 'Escape':
          e.preventDefault();
          enableAutoScroll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLine, handleStampLine, goBack, goNext, enableAutoScroll]);

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
      
      // Create a new word entry
      const newWord: Word = { text: wordText.trim(), time: timeSec };
      
      // Check if this word already exists (update it), otherwise add it
      const existingIndex = lineWords.findIndex(w => w && w.text === wordText.trim());
      
      if (existingIndex !== -1) {
        // Update existing word
        const updatedWords = [...lineWords];
        updatedWords[existingIndex] = newWord;
        newMap.set(lineIndex, updatedWords);
      } else {
        // Add new word in order
        const updatedWords = [...lineWords, newWord];
        // Sort by time to maintain chronological order
        updatedWords.sort((a, b) => (a?.time || 0) - (b?.time || 0));
        newMap.set(lineIndex, updatedWords);
      }
      
      return newMap;
    });
  }, [currentPositionMs, currentPosition]);

  const handleSaveTimestamp = useCallback((index: number, value: number) => {
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, [setTimestamps]);

  const handleSave = useCallback(() => {
    // Always save line-level LRC to lyrics.synced
    const lineLrc = generateLrc(lines, timestamps);
    onSave(lineLrc);
    
    // Additionally save word-level LRC to lyrics.wordSynced if in word timing mode
    if (wordTimingMode && wordTimestamps.size > 0) {
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
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <FaFont className="text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-800">Word Timing Mode</h3>
            <p className="text-sm text-gray-600">
              Enable to sync individual words (karaoke-style)
            </p>
          </div>
        </div>
        <button
          onClick={() => setWordTimingMode(!wordTimingMode)}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            wordTimingMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {wordTimingMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg border"
      >
        {lines.map((line, i) => {
          const time = timestamps[i];
          const isActive = i === currentLine;
          const lineWords = line?.trim() ? line.trim().split(/\s+/) : [];
          const wordTimes = wordTimestamps.get(i) || [];

          return (
            <div
              key={i}
              className={`flex flex-col gap-3 p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'bg-yellow-100 border-yellow-500 shadow-xl'
                  : time !== null
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-300'
              }`}
            >
              {/* Line-level controls */}
              <div className="flex gap-4 items-center cursor-pointer" onClick={() => goToLine(i)}>
                <TimestampDisplay
                  time={time}
                  isEditing={editingIndex === i}
                  editValue={editValue}
                  onEditChange={setEditValue}
                  onStartEdit={() => startEdit(i, formatTime(time!))}
                  onSaveEdit={() => saveEdit(handleSaveTimestamp)}
                  onCancelEdit={cancelEdit}
                />

                <div className="flex-1 font-medium text-lg text-black">
                  {line?.trim() ? line : '(instrumental)'}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStampLine(i);
                  }}
                  className={`text-xs px-3 py-1 rounded font-medium text-white transition ${
                    time !== null
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <FaClock className="inline mr-1" />
                  {time !== null ? 'Re-stamp' : 'Set Now'}
                </button>
              </div>

              {/* Word-level controls (only in word timing mode) */}
              {wordTimingMode && line?.trim() && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {lineWords.map((word, wi) => {
                    // Find the matching word in wordTimes by text content
                    const wordTime = wordTimes.find((wt, idx) => {
                      // Match by index first, then by text
                      return idx === wi || (wt && wt.text === word);
                    });
                    const hasTime = wordTime !== undefined && wordTime.time !== undefined;

                    return (
                      <button
                        key={wi}
                        onClick={() => handleStampWord(i, wi, word)}
                        className={`px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                          hasTime
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {hasTime && wordTime && (
                          <span className="text-xs opacity-75 mr-1.5">
                            {formatTime(wordTime.time).replace(/[\[\]]/g, '')}
                          </span>
                        )}
                        {word}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
