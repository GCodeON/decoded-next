import { formatTime } from '../utils/lrc';

interface TimestampDisplayProps {
  time: number | null;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function TimestampDisplay({
  time,
  isEditing,
  editValue,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit
}: TimestampDisplayProps) {
  if (time === null) {
    return (
      <div className="w-28 text-right font-mono text-sm">
        <span className="text-gray-400">[--:--.--]</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="w-28 text-right font-mono text-sm">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSaveEdit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          onBlur={onCancelEdit}
          className="w-24 px-1 text-right font-mono text-sm border-2 border-yellow-500 rounded bg-white focus:outline-none text-black"
          autoFocus
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div className="w-28 text-right font-mono text-sm">
      <span
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        className="cursor-pointer hover:text-blue-700 hover:underline font-medium text-black"
        title="Click to edit timestamp"
      >
        {formatTime(time)}
      </span>
    </div>
  );
}
