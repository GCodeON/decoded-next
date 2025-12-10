// Components
export { default as LyricsEditor } from './components/LyricsEditor';
// export { default as SyncLyricsEditor } from './components/archive/SyncLyricsEditor';
// export { default as SyncLyricsEditorWithWords } from './components/archive/SyncLyricsEditorWithWords';
export { default as SyncLyricsEditorUnified } from './components/SyncLyricsEditor';
export { default as SyncedLyrics } from './components/SyncedLyrics';
export { RhymeWordHighlight } from './components/RhymeWordHighlight';
export { PlainWordHighlight } from './components/PlainWordHighlight';
// export { default as AnimatedSyncedLyrics } from './components/AnimatedSyncedLyrics';
export { default as Legend } from './components/VowelLegend';
export { SyncControls } from './components/SyncControls';
export { TimestampDisplay } from './components/TimestampDisplay';

// Hooks
export { useSavedSong } from './hooks/useSavedSong';
export { useSongLyrics } from './hooks/useSongLyrics';
export { useLyricSync } from './hooks/useLyricSync';
export { useTimestampEditor } from './hooks/useTimestampEditor';
export { useSyncNavigation } from './hooks/useSyncNavigation';
export { useLrcLibPublish } from './hooks/useLrcLibPublish';
export { useRhymeColorMap } from './hooks/useRhymeColorMap';
export { useWordProgress } from './hooks/useWordProgress';

// Services
export { lyricsService } from './services/lyricsService';
export { songService } from './services/songService';

// Utils
export { lyricsToHtml, htmlToLyrics, mapLrcToRhymeHtml } from './utils/lyrics';
export { cleanTrackName, mstoSeconds, formatTime, parseLrcTime, parseLrcForEditing, matchLrcToPlainLines, generateLrc, isLikelySynced, isFullyStamped } from './utils/lrc';
export { parseEnhancedLrc, generateEnhancedLrc, getActiveWordIndex, splitLineIntoSegments } from './utils/lrcAdvanced';
export { parseRhymeLine, buildWordRanges, sliceSegmentsToWords, extractColor, buildColorMap } from './utils/rhyme-parser';
export type { Word, TimedLine, LrcFile, WordSegment } from './utils/lrcAdvanced';
export { computeSignature } from './utils/signature';

// Config
export { customColors, vowels } from './config/rhyme-colors';
export { WORD_STYLE, SEGMENT_STYLE, DEFAULT_WORD_DURATION, SCROLL_OPTIONS } from './config/sync-constants';

// Types
export type { LrcLibData, LyricsResponse, LyricsResult, LyricsSearchParams, PublishPayload, GetLyricsResult, PublishResult, ChallengeData } from './types/lyrics';
export type { SavedSong, SyncedLine, SyncedTrack } from './types/track';
export type { RhymeSegment, WordRhymeParts, ParsedRhymeLine, RhymeColorData, SyncMode, SyncedLyricsProps } from './types/rhyme';