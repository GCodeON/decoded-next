// Components
export { default as LyricsEditor } from './components/LyricsEditor';
export { default as SyncLyricsEditor } from './components/SyncLyricsEditor';
export { default as SyncedLyrics } from './components/SyncedLyrics';
export { default as Legend } from './components/VowelLegend';
export { SyncControls } from './components/SyncControls';
export { TimestampDisplay } from './components/TimestampDisplay';

// Hooks
export { useSavedSong } from './hooks/useSavedSong';
export { useSongLyrics } from './hooks/useSongLyrics';
export { useLyricSync } from './hooks/useLyricSync';
export { useTimestampEditor } from './hooks/useTimestampEditor';
export { useSyncNavigation } from './hooks/useSyncNavigation';

// Utils
export { lyricsToHtml, htmlToLyrics, mapLrcToRhymeHtml } from './utils/lyrics';
export { cleanTrackName, mstoSeconds, formatTime, parseLrcTime, parseLrcForEditing, matchLrcToPlainLines, generateLrc } from './utils/lrc';

// Config
export { customColors, vowels } from './config/rhyme-colors';

// Types
export type { LrcLibData, LyricsResponse, LyricsResult } from './types/lyrics';
export type { SavedSong, SyncedLine, SyncedTrack } from './types/track';