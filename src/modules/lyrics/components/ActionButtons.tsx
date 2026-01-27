import { FaClock, FaEdit, FaFont } from 'react-icons/fa';

export type ActionButtonsProps = {
  hasSynced: boolean;
  hasWordSynced: boolean;
  wordSyncEnabled: boolean;
  showRhymes: boolean;
  hasRhymeColors: boolean;
  rhymeColorMappingComplete: boolean;
  hasLyrics: boolean;
  lyricsLoading: boolean;
  onToggleWordSync: () => void;
  onToggleRhymes: () => void;
  onToggleRhymeComplete: () => void;
  onEditSync: () => void;
  onEditLyrics: () => void;
};

export default function ActionButtons({
  hasSynced,
  hasWordSynced,
  wordSyncEnabled,
  showRhymes,
  hasRhymeColors,
  rhymeColorMappingComplete,
  hasLyrics,
  lyricsLoading,
  onToggleWordSync,
  onToggleRhymes,
  onToggleRhymeComplete,
  onEditSync,
  onEditLyrics,
}: ActionButtonsProps) {
  
  if (lyricsLoading) {
    return null;
  }

  if (!hasLyrics) {
    return (
      <div className="flex gap-4">
        <button
          onClick={onEditLyrics}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
        >
          <FaEdit /> Add Lyrics
        </button>
      </div>
    );
  }

  const hasToggleButtons = hasWordSynced || hasRhymeColors;

  return (
    <div className={hasToggleButtons 
      ? "grid grid-cols-2 md:flex md:flex-row md:justify-between items-center gap-2 md:gap-4 w-full"
      : "flex flex-row gap-4 items-center justify-center w-full"
    }>  
      {/* Center: Action Buttons */}
      <div className="flex flex-row gap-4 items-center justify-center flex-1 md:order-1">
        <button
          onClick={onEditSync}
          className={`flex items-center gap-2 cursor-pointer ${hasSynced ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'} font-semibold`}
        >
          <FaClock /> {hasSynced ? 'Edit Sync' : 'Sync Lyrics'}
        </button>
        <button
          onClick={onEditLyrics}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <FaEdit /> Edit Lyrics
        </button>
      </div>

      {/* Right: Toggles */}
      {hasToggleButtons && (
        <div className="flex flex-col md:flex-row gap-1 md:gap-4 items-start justify-center md:justify-end md:order-2">
          {hasWordSynced && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative inline-block w-11 h-6">
                <input
                  type="checkbox"
                  checked={wordSyncEnabled}
                  onChange={onToggleWordSync}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
              <span className={`font-semibold flex items-center gap-1 ${
                wordSyncEnabled ? 'text-purple-600' : 'text-gray-600'
              }`}>
                Word Sync
              </span>
            </label>
          )}
          {hasRhymeColors && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative inline-block w-11 h-6">
                <input
                  type="checkbox"
                  checked={showRhymes}
                  onChange={onToggleRhymes}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-checked:bg-green-600 peer-focus:ring-2 peer-focus:ring-green-300 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
              <span className={`font-semibold ${
                showRhymes ? 'text-green-600' : 'text-gray-600'
              }`}>
                Rhymes
              </span>
            </label>
          )}
          {hasRhymeColors && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative inline-block w-11 h-6">
                <input
                  type="checkbox"
                  checked={rhymeColorMappingComplete}
                  onChange={onToggleRhymeComplete}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-checked:bg-teal-600 peer-focus:ring-2 peer-focus:ring-teal-300 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
              <span className={`font-semibold ${
                rhymeColorMappingComplete ? 'text-teal-600' : 'text-gray-600'
              }`}>
                Mapping Complete
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
