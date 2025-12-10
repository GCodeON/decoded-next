'use client';
import { FaClock } from 'react-icons/fa';
import { TimestampDisplay, formatTime } from '@/modules/lyrics';
import { type Word } from '@/modules/lyrics/utils/lrcAdvanced';

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
  onCancelEdit
}: WordEditorProps) {
  const lineWords = line?.trim() ? line.trim().split(/\s+/) : [];

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
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />

        <div className="flex-1 font-medium text-lg text-black">
          {line?.trim() ? line : '(instrumental)'}
        </div>

        {/* Hide line stamp button in word sync mode */}
        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            onStampLine();
          }}
          className={`text-xs px-3 py-1 rounded font-medium text-white transition ${
            time !== null
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <FaClock className="inline mr-1" />
          {time !== null ? 'Re-stamp' : 'Set Now'}
        </button> */}
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

            return (
              <button
                key={wi}
                onClick={() => onStampWord(wi, word)}
                className={`px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                  isCurrent
                    ? 'bg-yellow-500 text-white ring-2 ring-yellow-600 shadow-lg scale-110'
                    : hasTime
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
}
