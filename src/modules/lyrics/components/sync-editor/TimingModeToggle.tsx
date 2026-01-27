import { FaFont } from 'react-icons/fa';
import { Word } from '@/modules/lyrics';

interface TimingModeToggleProps {
  wordTimingMode: boolean;
  onToggle: () => void;
  wordTimestamps: Map<number, Word[]>;
  onClearLineWordTimestamps: () => void;
  onClearAllWordTimestamps: () => void;
}

export default function TimingModeToggle({
  wordTimingMode,
  onToggle,
  wordTimestamps,
  onClearLineWordTimestamps,
  onClearAllWordTimestamps,
}: TimingModeToggleProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 gap-4">
        <div className="flex flex-col items-start gap-1">
            <h2 className="font-semibold text-gray-800">
              {wordTimingMode 
                ? 'Word Timing Mode' 
                : 'Lyric Timing Mode'}
            </h2>
            <div className="flex flex-col gap-2">
                <h4 className="font-semibold text-gray-700">
                {wordTimingMode 
                    ? 'Disable to sync individual lines' 
                    : 'Enable to sync individual words (karaoke-style)'}
                </h4>
                <p className="text-sm text-gray-600">
                {wordTimingMode 
                    ? 'Press Enter to stamp each word, ← → to navigate words, ↑ ↓ for lines' 
                    : 'Space = Stamp • ↑ = Prev • ↓ = Next • Esc = Auto-Scroll'}
                </p>

            </div>

        </div>
        <button
          onClick={onToggle}
          className={`px-6 py-2 font-semibold transition-all cursor-pointer ${
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
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200">
          <button
            onClick={onClearLineWordTimestamps}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold"
          >
            Clear Current Line
          </button>
          <button
            onClick={onClearAllWordTimestamps}
            className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all text-sm font-semibold"
          >
            Clear All Timestamps
          </button>
        </div>
      )}
    </div>
  );
}
