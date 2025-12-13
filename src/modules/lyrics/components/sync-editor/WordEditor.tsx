'use client';
import { useState, useCallback } from 'react';
import { FaClock } from 'react-icons/fa';
import { TimestampDisplay, formatTime } from '@/modules/lyrics';
import { parseLrcTime } from '@/modules/lyrics/utils/lrc';
import { type Word } from '@/modules/lyrics/utils/lrcAdvanced';

interface WordTimestampState {
  lineIndex: number;
  wordIndex: number;
  editValue: string;
}

interface WordEditorProps {
  line: string;
  lineIndex: number;
  time: number | null;
  isActive: boolean;
  editingIndex: number | null;
  editValue: string;
  wordTimestamps: Word[];
  currentWordIndex: number;
  onStampLine: () => void;
  onStampWord: (wordIndex: number, wordText: string) => void;
  onGoToLine: () => void;
  onEditChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onSaveWordTime?: (lineIndex: number, wordIndex: number, time: number) => void;
  onDisableAutoScroll?: () => void;
}

export default function WordEditor({
  line,
  lineIndex,
  time,
  isActive,
  editingIndex,
  editValue,
  wordTimestamps,
  currentWordIndex,
  onStampLine,
  onStampWord,
  onGoToLine,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSaveWordTime,
  onDisableAutoScroll
}: WordEditorProps) {
  const lineWords = line?.trim() ? line.trim().split(/\s+/) : [];
  const [wordTimestampState, setWordTimestampState] = useState<WordTimestampState | null>(null);

  const handleStartWordEdit = useCallback(
    (e: React.MouseEvent, lineIdx: number, wordIdx: number, wordTime: number) => {
      e.stopPropagation();
      onDisableAutoScroll?.();
      setWordTimestampState({
        lineIndex: lineIdx,
        wordIndex: wordIdx,
        editValue: formatTime(wordTime).replace(/[\[\]]/g, '')
      });
    },
    [onDisableAutoScroll]
  );

  const handleWordEditChange = useCallback((value: string) => {
    setWordTimestampState((prev) =>
      prev ? { ...prev, editValue: value } : null
    );
  }, []);

  const handleSaveWordTime = useCallback(() => {
    if (!wordTimestampState) return;
    const parsedTime = parseLrcTime(wordTimestampState.editValue);
    if (!isNaN(parsedTime) && onSaveWordTime) {
      onSaveWordTime(
        wordTimestampState.lineIndex,
        wordTimestampState.wordIndex,
        parsedTime
      );
      setWordTimestampState(null);
    }
  }, [wordTimestampState, onSaveWordTime]);

  const handleCancelWordEdit = useCallback(() => {
    setWordTimestampState(null);
  }, []);

  return (
    <div
      className={`flex flex-col gap-3 p-4 rounded-lg border-2 transition-all ${
        isActive
          ? 'bg-yellow-100 border-yellow-500 shadow-xl'
          : time !== null
          ? 'bg-green-50 border-green-300'
          : 'bg-white border-gray-300'
      }`}
    >
      {/* Line-level controls */}
      <div className="flex gap-4 items-center cursor-pointer" onClick={onGoToLine}>
        <TimestampDisplay
          time={time}
          isEditing={editingIndex === lineIndex}
          editValue={editValue}
          onEditChange={onEditChange}
          onStartEdit={() => {
            onDisableAutoScroll?.();
            onStartEdit();
          }}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          compact={false}
        />

        <div className="flex-1 font-medium text-lg text-black">
          {line?.trim() ? line : '(instrumental)'}
        </div>
      </div>

      {/* Word-level controls */}
      {line?.trim() && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          {lineWords.map((word, wi) => {
            // Find the matching word in wordTimes by text content
            const wordTime = wordTimestamps.find((wt, idx) => {
              return idx === wi || (wt && wt.text === word);
            });
            const hasTime = wordTime !== undefined && wordTime.time !== undefined;
            const isCurrent = isActive && wi === currentWordIndex;
            const isWordEditing =
              wordTimestampState?.wordIndex === wi &&
              wordTimestampState?.lineIndex === lineIndex;

            return (
              <div
                key={wi}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                  isCurrent
                    ? 'bg-yellow-500 text-white ring-2 ring-yellow-600 shadow-lg'
                    : hasTime
                    ? 'bg-green-400 text-black'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {hasTime && wordTime && (
                  <div className="text-xs">
                    <TimestampDisplay
                      time={wordTime.time}
                      isEditing={!!wordTimestampState}
                      editValue={wordTimestampState?.editValue || ''}
                      onEditChange={handleWordEditChange}
                      onStartEdit={(index) =>
                        handleStartWordEdit(
                          new MouseEvent('click') as any,
                          lineIndex,
                          wi,
                          wordTime.time
                        )
                      }
                      onSaveEdit={handleSaveWordTime}
                      onCancelEdit={handleCancelWordEdit}
                      editIndex={wordTimestampState?.wordIndex}
                      currentIndex={wi}
                      compact={true}
                      cancelOnBlur={false}
                    />
                  </div>
                )}

                <button
                  onClick={(e) => {
                    if (!isWordEditing) {
                      onStampWord(wi, word);
                    }
                  }}
                  disabled={isWordEditing}
                  className={`transition-opacity ${
                    isCurrent ? '' : ''
                  } ${isWordEditing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                  title={
                    isWordEditing
                      ? 'Press Enter to save or Escape to cancel'
                      : 'Click to stamp word time'
                  }
                >
                  {word}
                </button>

                {isWordEditing && (
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveWordTime();
                      }}
                      className="px-2 py-0.5 bg-green-700 hover:bg-green-800 text-white text-xs rounded"
                      title="Save timestamp (Enter)"
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelWordEdit();
                      }}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                      title="Cancel edit (Escape)"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
