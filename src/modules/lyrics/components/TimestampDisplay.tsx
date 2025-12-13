import { formatTime } from '../utils/lrc';

export interface TimestampDisplayProps {
  time: number | null;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onStartEdit: (index?: any) => void;
  onSaveEdit: (index?: any) => void;
  onCancelEdit: () => void;
  editIndex?: any;
  currentIndex?: any;
  compact?: boolean;
  cancelOnBlur?: boolean;
}

export function TimestampDisplay({
  time,
  isEditing,
  editValue,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  editIndex,
  currentIndex,
  compact = false,
  cancelOnBlur = true
}: TimestampDisplayProps) {
  // Only show editing mode if this specific item is being edited
  const isThisItemEditing = isEditing && editIndex === currentIndex;
  const width = compact ? 'w-20' : 'w-28';
  const inputWidth = compact ? 'w-16' : 'w-24';

  if (time === null) {
    return (
      <div className={`${width} text-center font-mono text-sm`}>
        <span className="text-gray-400">[--:--.--]</span>
      </div>
    );
  }

  if (isThisItemEditing) {
    return (
      <div className={`${width} text-center font-mono text-sm`}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSaveEdit(currentIndex);
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          onBlur={cancelOnBlur ? onCancelEdit : undefined}
          className={`w-full px-1 text-right font-mono text-sm border-2 border-yellow-500 rounded bg-white focus:outline-none text-black`}
          autoFocus
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div className={`${width} text-right font-mono text-sm`}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit(currentIndex);
        }}
        className="cursor-pointer hover:text-blue-700 hover:underline font-medium text-black"
        title="Click to edit timestamp"
      >
        {formatTime(time)}
      </span>
    </div>
  );
}
