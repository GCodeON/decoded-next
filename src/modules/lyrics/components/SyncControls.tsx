import { FaPlayCircle, FaPauseCircle } from 'react-icons/fa';

interface SyncControlsProps {
  isPlaying: boolean;
  currentPosition: number;
  togglePlayback: () => void;
  allStamped: boolean;
  manualNavigation: boolean;
  onEnableAutoScroll: () => void;
}

export function SyncControls({
  isPlaying,
  currentPosition,
  togglePlayback,
  allStamped,
  manualNavigation,
  onEnableAutoScroll
}: SyncControlsProps) {
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold text-black">Sync Lyrics to Music</h3>
        {allStamped && manualNavigation && (
          <button
            onClick={onEnableAutoScroll}
            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition"
            title="Re-enable auto-scroll to follow playback"
          >
            Enable Auto-Scroll
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={togglePlayback}
          className="text-green-600 hover:scale-110 transition"
        >
          {isPlaying ? <FaPauseCircle size={28} /> : <FaPlayCircle size={28} />}
        </button>
        <span className="font-mono text-lg text-black">
          {Math.floor(currentPosition / 60)}:
          {(currentPosition % 60).toFixed(0).padStart(2, '0')}
        </span>
        <span className="text-gray-600">
          Space = Stamp • ↑ = Prev • ↓ = Next • Esc = Auto-Scroll
        </span>
      </div>
    </div>
  );
}
