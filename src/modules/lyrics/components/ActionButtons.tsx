'use client';

import { useEffect, useState } from 'react';
import { FaClock, FaEdit, FaCog, FaTimes, FaExpand, FaBrain, FaMagic } from 'react-icons/fa';

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
  isAdmin?: boolean;
  isAutoEncoding?: boolean;
  showWordSyncToggle?: boolean;
  onToggleWordSync: () => void;
  onToggleRhymes: () => void;
  onToggleRhymeComplete: () => void;
  onEditSync: () => void;
  onEditLyrics: () => void;
  onOpenQuantification?: () => void;
  onAutoEncode?: () => void;
  onAdminControlsHiddenChange?: (hidden: boolean) => void;
  leadAdjustmentSec?: number;
  onLeadAdjustmentChange?: (value: number) => void;
  youtubeUrl?: string;
  onYoutubeUrlChange?: (value: string) => void;
  showLeadAdjustment?: boolean;
  showMobilePresentationToggle?: boolean;
  onTogglePresentationMode?: () => void;
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
  isAdmin = false,
  isAutoEncoding = false,
  showWordSyncToggle = true,
  onToggleWordSync,
  onToggleRhymes,
  onToggleRhymeComplete,
  onEditSync,
  onEditLyrics,
  onOpenQuantification,
  onAutoEncode,
  onAdminControlsHiddenChange,
  leadAdjustmentSec = 0,
  onLeadAdjustmentChange,
  youtubeUrl = '',
  onYoutubeUrlChange,
  showLeadAdjustment = true,
  showMobilePresentationToggle = false,
  onTogglePresentationMode,
}: ActionButtonsProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [adminAvailable, setAdminAvailable] = useState(true);

  useEffect(() => {
    if (!isAdmin || !onAdminControlsHiddenChange) return;
    onAdminControlsHiddenChange(!adminAvailable);
  }, [adminAvailable, isAdmin, onAdminControlsHiddenChange]);
  
  if (lyricsLoading) {
    return null;
  }

  if (!hasLyrics) {
    return (
      <div className="flex gap-4">
        {isAdmin && (
          <button
            onClick={onEditLyrics}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
          >
            <FaEdit /> Add Lyrics
          </button>
        )}
      </div>
    );
  }

  const canShowWordSync = hasWordSynced && showWordSyncToggle;
  const hasToggleButtons = canShowWordSync || hasRhymeColors;

  return (
    <>
      {/* Desktop View - Action buttons only (inputs are on page level) */}
      <div className="hidden md:flex flex-col w-full gap-0">
        {/* Action Controls Row */}
        <div className={`flex ${(isAdmin && hasToggleButtons) ? 'justify-between' : (hasToggleButtons ? 'justify-end' : 'justify-center')} items-center gap-8 w-full`}>
          {/* Center: Action Buttons (Edit Sync, Edit Lyrics) - Admin Only */}
          {isAdmin && (
            <div className="flex flex-row gap-4 items-center justify-center flex-1">
              <button
                onClick={onEditSync}
                className={`flex items-center gap-2 cursor-pointer ${hasSynced ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'} font-semibold`}
              >
                <FaClock /> {hasSynced ? 'Edit Sync' : 'Sync Lyrics'}
              </button>
              <button
                onClick={onEditLyrics}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 cursor-pointer font-semibold"
              >
                <FaEdit /> Edit Lyrics
              </button>
              {onAutoEncode && (
                <button
                  onClick={onAutoEncode}
                  disabled={isAutoEncoding}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 cursor-pointer font-semibold bg-purple-950/40 border border-purple-800/50 px-3 py-1 rounded-lg text-sm transition-all hover:scale-105 disabled:opacity-50"
                  title="Auto-detect rhymes & vowel colors using AI"
                >
                  <FaMagic className={isAutoEncoding ? 'animate-spin' : ''} />
                  {isAutoEncoding ? 'Encoding AI...' : 'Auto-Encode (AI)'}
                </button>
              )}
            </div>
          )}

          {/* Right: Quantification & Toggles */}
          <div className="flex flex-row gap-4 items-center justify-end">
            {onOpenQuantification && (
              <button
                onClick={onOpenQuantification}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-950/40 border border-amber-800/50 px-3 py-1.5 rounded-lg transition-all hover:scale-105 cursor-pointer shadow-sm"
                title="Open Lyrical Quantification Dashboard"
              >
                <FaBrain className="text-sm text-yellow-400" />
                <span>Quantify</span>
              </button>
            )}

            {hasToggleButtons && <>
              {canShowWordSync && (
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
              {hasRhymeColors && isAdmin && (
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
            </>}
            </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden w-full items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-3">
          {onOpenQuantification && (
            <button
              onClick={onOpenQuantification}
              className="p-2 rounded-lg border border-amber-500/30 bg-amber-950/50 text-amber-300 text-xs font-bold flex items-center gap-1"
              title="Lyrical Quantification"
            >
              <FaBrain className="text-yellow-400" />
            </button>
          )}
          {canShowWordSync && (
            <label className="flex items-center gap-1 cursor-pointer">
              <div className="relative inline-block w-10 h-6">
                <input
                  type="checkbox"
                  checked={wordSyncEnabled}
                  onChange={onToggleWordSync}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-500 rounded-full peer peer-checked:bg-purple-600 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
              <span className={`font-semibold text-xs ${
                wordSyncEnabled ? 'text-purple-600' : 'text-gray-600'
              }`}>
                Word Sync
              </span>
            </label>
          )}
          {hasRhymeColors && (
            <label className="flex items-center gap-1 cursor-pointer">
              <div className="relative inline-block w-10 h-6">
                <input
                  type="checkbox"
                  checked={showRhymes}
                  onChange={onToggleRhymes}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-500 rounded-full peer peer-checked:bg-green-600 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
              <span className={`font-semibold text-xs ${
                showRhymes ? 'text-green-600' : 'text-gray-600'
              }`}>
                Rhymes
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && adminAvailable && (
            <button
              type="button"
              aria-label="Open admin controls"
              onClick={() => setShowMobileMenu(true)}
              className="inline-flex rounded-lg border border-white/10 bg-black/60 p-2 text-white shadow-lg transition hover:bg-black/70 cursor-pointer hover:border-white/20"
            >
              <FaCog />
            </button>
          )}
          {showMobilePresentationToggle && (
            <button
              type="button"
              aria-label="Enter presentation mode"
              onClick={onTogglePresentationMode}
              className="inline-flex rounded-lg border border-white/10 bg-black/60 p-2 text-white shadow-lg transition hover:bg-black/70 cursor-pointer hover:border-white/20"
            >
              <FaExpand />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Modal - Admin Only Commands */}
      {showMobileMenu && isAdmin && adminAvailable && (
        <div className={`fixed inset-0 z-50 flex items-end md:hidden overflow-hidden ${isPlaying ? 'pb-[150px]' : 'pb-[70px]'}`}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75"
            onClick={() => {
              setShowMobileMenu(false);
              setAdminAvailable(false);
            }}
          />
          
          {/* Menu Content */}
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-lg p-6 space-y-4 animate-slide-up max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Admin Options</h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes className="text-xl cursor-pointer" />
              </button>
            </div>

            {/* Admin Inputs Section - Lead Adjustment & YouTube URL */}
            {showLeadAdjustment && (
              <div className="flex flex-col gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-1">
                  <label htmlFor="lead-adjust-mobile" className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Lead Adjustment (ms):
                  </label>
                  <input
                    id="lead-adjust-mobile"
                    type="number"
                    value={Math.round((leadAdjustmentSec || 0) * 1000)}
                    onChange={(e) => onLeadAdjustmentChange?.(Number(e.target.value) / 1000)}
                    step={50}
                    className="w-full rounded bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="youtube-url-mobile" className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    YouTube URL:
                  </label>
                  <input
                    id="youtube-url-mobile"
                    type="url"
                    value={youtubeUrl || ''}
                    onChange={(e) => onYoutubeUrlChange?.(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* Admin Action Buttons - Mobile */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  onEditSync();
                  setShowMobileMenu(false);
                  setAdminAvailable(false);
                }}
                className={`flex items-center gap-3 w-full cursor-pointer ${hasSynced ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'} font-semibold text-lg p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                <FaClock className="text-xl" /> {hasSynced ? 'Edit Sync' : 'Sync Lyrics'}
              </button>
              <button
                onClick={() => {
                  onEditLyrics();
                  setShowMobileMenu(false);
                  setAdminAvailable(false);
                }}
                className="flex items-center gap-3 w-full text-blue-600 hover:text-blue-700 cursor-pointer font-semibold text-lg p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaEdit className="text-xl" /> Edit Lyrics
              </button>

              {/* Mapping Complete Toggle - Admin Only */}
              {hasRhymeColors && (
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
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
          </div>
        </div>
      )}
    </>
  );
}
