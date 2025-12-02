'use client';
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { FaClock } from 'react-icons/fa';
import { 
  formatTime, 
  generateLrc, 
  useLyricSync, 
  useTimestampEditor, 
  TimestampDisplay, 
  SyncControls
} from '@/modules/lyrics';
interface Props {
  plainLyrics: string;
  existingLrc?: string | null;
  currentPosition: number;
  currentPositionMs?: number;
  isPlaying: boolean;
  togglePlayback: () => void;
  onSave: (lrc: string) => void;
  onCancel: () => void;
}

export default function SyncLyricsEditor({
  plainLyrics,
  existingLrc,
  currentPosition,
  currentPositionMs,
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
  // Behavior:
  // - If we have a manual override (set by navigation or last-follow), use it
  // - Else use activeLine when available
  // - Fallback to 0 only when neither exists (initial state)
  const currentLine = useMemo(() => {
    // When paused, retain the last manual override to avoid skipping lines on resume
    if (!isPlaying && manualLineOverride !== null) return manualLineOverride;
    if (activeLine !== null) return activeLine;
    return 0;
  }, [manualLineOverride, activeLine, isPlaying]);

  // Update manual override when activeLine changes (auto-follow when not manually navigating)
  useEffect(() => {
    if (activeLine !== null && !manualNavigation && editingIndex === null) {
      setManualLineOverride(activeLine);
    }
  }, [activeLine, manualNavigation, editingIndex]);

  // Debug: log active/current line transitions and unpause responsiveness
  useEffect(() => {
    console.log('[SyncLyricsEditor] isPlaying', { isPlaying, ts: Math.floor(performance.now()) });
  }, [isPlaying]);

  useEffect(() => {
    console.log('[SyncLyricsEditor] activeLine', { activeLine, ts: Math.floor(performance.now()) });
  }, [activeLine]);

  useEffect(() => {
    console.log('[SyncLyricsEditor] currentLine', { currentLine, ts: Math.floor(performance.now()) });
  }, [currentLine]);

  // Navigation callbacks
  const stampCurrent = useCallback(() => {
    const ms = typeof currentPositionMs === 'number' ? currentPositionMs : currentPosition * 1000;
    const sec = Math.floor(ms / 1000);
    setTimestamps(prev => {
      const next = [...prev];
      next[currentLine] = Number(sec.toFixed(2));
      return next;
    });
    setManualLineOverride(Math.min(lines.length - 1, currentLine + 1));
  }, [currentPositionMs, currentPosition, lines.length, setTimestamps, currentLine]);

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

  // Auto-scroll to current line - use rAF for smooth, immediate scrolling
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
        allStamped={allStampedStatus}
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
          disabled={!allStampedStatus}
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