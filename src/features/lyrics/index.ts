// Components
export { default as LyricsEditor } from './components/LyricsEditor';
export { default as SyncLyricsEditor } from './components/SyncLyricsEditor';
export { default as SyncedLyrics } from './components/SyncedLyrics';
export { default as Legend } from './components/VowelLegend';

// Hooks
export { useSavedSong } from './hooks/useSavedSong';
export { useSongLyrics } from './hooks/useSongLyrics';

// Utils (only export what's needed externally)
export { lyricsToHtml, htmlToLyrics, mapLrcToRhymeHtml } from './utils/lyrics';
export { formatTime, parseLrcTime } from './utils/lrc';

// Config (if needed externally)
export { customColors, vowels } from './config/rhyme-colors';

// Types
export type { LrcLibData, LyricsResponse, LyricsResult } from './types/lyrics';
export type { SavedSong, SyncedLine, SyncedTrack } from './types/track';