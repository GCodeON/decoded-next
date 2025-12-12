'use client';
import { FaClock } from 'react-icons/fa';
import { TimestampDisplay, formatTime } from '@/modules/lyrics';

interface LineEditorProps {
  line: string;
  lineIndex: number;
  time: number | null;
  isActive: boolean;
  editingIndex: number | null;
  editValue: string;
  onStampLine: () => void;
  onGoToLine: () => void;
  onEditChange: (value: string) => void;
  onStartEdit: (index: number, value: string) => void;
  onSaveEdit: (index: number) => void;
  onCancelEdit: () => void;
}

export default function LineEditor({
  line,
  lineIndex,
  time,
  isActive,
  editingIndex,
  editValue,
  onStampLine,
  onGoToLine,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit
}: LineEditorProps) {
  return (
    <div
      className={`flex gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isActive
          ? 'bg-yellow-100 border-yellow-500 shadow-xl'
          : time !== null
          ? 'bg-green-50 border-green-300'
          : 'bg-white border-gray-300'
      }`}
      onClick={onGoToLine}
    >
      <TimestampDisplay
        time={time}
        isEditing={editingIndex !== null}
        editValue={editValue}
        onEditChange={onEditChange}
        onStartEdit={(index) => onStartEdit(index as number, formatTime(time!))}
        onSaveEdit={(index) => onSaveEdit(index as number)}
        onCancelEdit={onCancelEdit}
        editIndex={editingIndex}
        currentIndex={lineIndex}
        compact={false}
      />

      <div className="flex-1 font-medium text-lg text-black">
        {line?.trim() ? line : '(instrumental)'}
      </div>

      <button
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
      </button>
    </div>
  );
}
