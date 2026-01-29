import { useState } from 'react';
import { FaClock, FaEdit, FaCog, FaTimes } from 'react-icons/fa';

export type ActionButtonsProps = {
  hasSynced: boolean;
  hasWordSynced: boolean;
  wordSyncEnabled: boolean;
  showRhymes: boolean;
  hasRhymeColors: boolean;
  rhymeColorMappingComplete: boolean;
  hasLyrics: boolean;
  lyricsLoading: boolean;
  isPlaying?: boolean;
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
  isPlaying = false,
  onToggleWordSync,
  onToggleRhymes,
  onToggleRhymeComplete,
  onEditSync,
  onEditLyrics,
}: ActionButtonsProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
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
    <>
      {/* Desktop View */}
      <div className={`hidden md:flex ${hasToggleButtons 
        ? "md:flex-row md:justify-between items-center gap-4 w-full"
        : "flex-row gap-4 items-center justify-center w-full"
      }`}>  
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
          <div className="flex flex-row gap-4 items-center justify-end md:order-2">
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

      {/* Mobile View */}
      <div className="flex md:hidden w-full justify-center items-center">
        <button
          onClick={() => setShowMobileMenu(true)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-semibold cursor-pointer bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded-lg"
        >
          <FaCog className="text-xl" /> Settings
        </button>
      </div>

      {/* Mobile Menu Modal */}
      {showMobileMenu && (
        <div className={`fixed inset-0 z-50 flex items-end md:hidden ${isPlaying ? 'pb-[150px]' : 'pb-[70px]'}`}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Menu Content */}
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-lg p-6 space-y-4 animate-slide-up max-h-[70vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Options</h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes className="text-xl cursor-pointer" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
              <button
                onClick={() => {
                  onEditSync();
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-3 w-full cursor-pointer ${hasSynced ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'} font-semibold text-lg p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                <FaClock className="text-xl" /> {hasSynced ? 'Edit Sync' : 'Sync Lyrics'}
              </button>
              <button
                onClick={() => {
                  onEditLyrics();
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-3 w-full text-blue-600 hover:text-blue-700 cursor-pointer font-semibold text-lg p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaEdit className="text-xl" /> Edit Lyrics
              </button>
            </div>

            {/* Toggles */}
            {hasToggleButtons && (
              <div className="space-y-4 pt-2">
                {hasWordSynced && (
                  <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className={`font-semibold text-lg ${
                      wordSyncEnabled ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Word Sync
                    </span>
                    <div className="relative inline-block w-14 h-8">
                      <input
                        type="checkbox"
                        checked={wordSyncEnabled}
                        onChange={onToggleWordSync}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-8 bg-gray-500 rounded-full peer peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 transition-colors"></div>
                      <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </div>
                  </label>
                )}
                {hasRhymeColors && (
                  <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className={`font-semibold text-lg ${
                      showRhymes ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Rhymes
                    </span>
                    <div className="relative inline-block w-14 h-8">
                      <input
                        type="checkbox"
                        checked={showRhymes}
                        onChange={onToggleRhymes}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-8 bg-gray-500 rounded-full peer peer-checked:bg-green-600 peer-focus:ring-2 peer-focus:ring-green-300 transition-colors"></div>
                      <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </div>
                  </label>
                )}
                {hasRhymeColors && (
                  <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className={`font-semibold text-lg ${
                      rhymeColorMappingComplete ? 'text-teal-600' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Mapping Complete
                    </span>
                    <div className="relative inline-block w-14 h-8">
                      <input
                        type="checkbox"
                        checked={rhymeColorMappingComplete}
                        onChange={onToggleRhymeComplete}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-8 bg-gray-500 rounded-full peer peer-checked:bg-teal-600 peer-focus:ring-2 peer-focus:ring-teal-300 transition-colors"></div>
                      <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </div>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
