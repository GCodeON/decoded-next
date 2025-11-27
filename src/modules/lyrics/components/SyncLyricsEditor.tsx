'use client';
import { useRef, useCallback, useEffect } from 'react';
import { FaClock } from 'react-icons/fa';
import { 
  formatTime, 
  generateLrc, 
  useLyricSync, 
  useTimestampEditor, 
  useSyncNavigation, 
  TimestampDisplay, 
  SyncControls
} from '@/modules/lyrics';
interface Props {
  plainLyrics: string;
  existingLrc?: string | null;
  currentPosition: number;
  isPlaying: boolean;
  togglePlayback: () => void;
  onSave: (lrc: string) => void;
  onCancel: () => void;
}

export default function SyncLyricsEditor({
  plainLyrics,
  existingLrc,
  currentPosition,
  isPlaying,
  togglePlayback,
  onSave,
  onCancel
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state - autoScroll true so we get activeLine for auto-follow
  const { lines, timestamps, setTimestamps, allStamped, activeLine } = useLyricSync({
    plainLyrics,
    existingLrc,
    currentPosition,
    isPlaying,
    autoScroll: true
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

  // Navigation callbacks
  const stampCurrent = useCallback(() => {
    setTimestamps(prev => {
      const next = [...prev];
      next[currentLine] = Number(currentPosition.toFixed(2));
      return next;
    });
    setCurrentLine(prev => Math.min(lines.length - 1, prev + 1));
  }, [currentPosition, lines.length, setTimestamps]);

  const goBack = useCallback(() => {
    setCurrentLine(prev => Math.max(0, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentLine(prev => Math.min(lines.length - 1, prev + 1));
  }, [lines.length]);

  const {
    currentLine,
    setCurrentLine,
    manualNavigation,
    goToLine,
    enableAutoScroll
  } = useSyncNavigation({
    totalLines: lines.length,
    allStamped,
    onStamp: stampCurrent,
    onBack: goBack,
    onNext: goNext
  });

  // Follow playback when not manually navigating
  useEffect(() => {
    if (activeLine !== null && !manualNavigation && editingIndex === null) {
      setCurrentLine(activeLine);
    }
  }, [activeLine, manualNavigation, editingIndex, setCurrentLine]);

  // Auto-scroll to current line
  useEffect(() => {
    containerRef.current?.children[currentLine]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLine]);

  // Handlers
  const handleStampLine = useCallback((index: number) => {
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = Number(currentPosition.toFixed(2));
      return next;
    });
    if (index === currentLine) {
      setCurrentLine(Math.min(lines.length - 1, index + 1));
    }
  }, [currentPosition, currentLine, lines.length, setTimestamps, setCurrentLine]);

  const handleSaveTimestamp = useCallback((index: number, value: number) => {
    setTimestamps(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, [setTimestamps]);

  const handleSave = useCallback(() => {
    const lrc = generateLrc(lines, timestamps);
    onSave(lrc);
  }, [lines, timestamps, onSave]);

  const lrc = generateLrc(lines, timestamps);

  return (
    <div className="space-y-6">
      <SyncControls
        isPlaying={isPlaying}
        currentPosition={currentPosition}
        togglePlayback={togglePlayback}
        allStamped={allStamped}
        manualNavigation={manualNavigation}
        onEnableAutoScroll={enableAutoScroll}
      />

      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg border"
      >
        {lines.map((line, i) => {
          const time = timestamps[i];
          const isActive = i === currentLine;

          return (
            <div
              key={i}
              className={`flex gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-yellow-100 border-yellow-500 shadow-xl'
                  : time !== null
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-300'
              }`}
              onClick={() => goToLine(i)}
            >
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
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={!allStamped}
          className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          Save Synced Lyrics
        </button>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-900">
          Cancel
        </button>
      </div>

      {lrc && (
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            Preview LRC Output
          </summary>
          <pre className="mt-3 p-4 bg-gray-900 text-gray-300 text-xs font-mono rounded overflow-x-auto">
            {lrc}
          </pre>
        </details>
      )}
    </div>
  );
}