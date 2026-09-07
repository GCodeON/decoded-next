// Components
export { default as LyricsEditor } from './components/LyricsEditor';
export { default as SyncLyricsEditor } from './components/SyncLyricsEditor';
export { default as SyncedLyrics } from './components/SyncedLyrics';
export { RhymeWordHighlight } from './components/RhymeWordHighlight';
export { PlainWordHighlight } from './components/PlainWordHighlight';
export { default as Legend } from './components/VowelLegend';
export { SyncControls } from './components/SyncControls';
export { TimestampDisplay, type TimestampDisplayProps } from './components/TimestampDisplay';
export { default as LiterarySpectrogram } from './components/LiterarySpectrogram';
export { default as LyricalQuantificationDashboard } from './components/LyricalQuantificationDashboard';

// Hooks
export { useSavedSong } from './hooks/useSavedSong';
export { useSongLyrics } from './hooks/useSongLyrics';
export { useLyricSync } from './hooks/useLyricSync';
export { useTimestampEditor } from './hooks/useTimestampEditor';
export { useSyncNavigation } from './hooks/useSyncNavigation';
export { useLrcLibPublish } from './hooks/useLrcLibPublish';
export { useRhymeColorMap } from './hooks/useRhymeColorMap';
export { useWordProgress } from './hooks/useWordProgress';
export { useHasRhymeColors } from './hooks/useHasRhymeColors';
export { useSeekToLine } from './hooks/useSeekToLine';

// Services
export { lyricsService } from './services/lyricsService';
export { songService } from './services/songService';
export { autoEncodeLyrics, buildRhymeEncodingPrompt } from './services/aiLyricsService';

// Utils
export { lyricsToHtml, htmlToLyrics, splitLyricsIntoLines, mapLrcToRhymeHtml } from './utils/lyrics';
export { cleanTrackName, mstoSeconds, formatTime, parseLrcTime, parseLrcForEditing, matchLrcToPlainLines, generateLrc, isLikelySynced, isFullyStamped, sanitizeLrcOutput } from './utils/lrc';
export { replaceLyricsInLrc, validateLyricsConsistency, detectCaseVariants, applyCaseTransformation, extractLineText } from './utils/lrc-replace';
export { parseEnhancedLrc, generateEnhancedLrc, sanitizeEnhancedLrcOutput, getActiveWordIndex, splitLineIntoSegments } from './utils/lrcAdvanced';
export { parseRhymeLine, buildWordRanges, sliceSegmentsToWords, buildColorMap } from './utils/rhyme-parser';
export { computeLyricalQuantification, countWordSyllables } from './utils/quantification';
export type { Word, TimedLine, LrcFile, WordSegment } from './utils/lrcAdvanced';
export { computeSignature } from './utils/signature';
export { playVowelSound, preloadVowelSounds, vowelAudioMap } from './utils/vowelAudio';
export { playSynthesizedVowel, isSynthesisSupported } from './utils/vowelSynthesizer';

// Config
export { customColors, vowels } from './config/rhyme-colors';
export { WORD_STYLE, SEGMENT_STYLE, DEFAULT_WORD_DURATION, SCROLL_OPTIONS } from './config/sync-constants';

// Types
export type { LrcLibData, LyricsResponse, LyricsResult, LyricsSearchParams, PublishPayload, GetLyricsResult, PublishResult, ChallengeData } from './types/lyrics';
export type { SavedSong, SyncedLine, SyncedTrack } from './types/track';
export type { RhymeSegment, WordRhymeParts, ParsedRhymeLine, RhymeColorData, SyncMode, SyncedLyricsProps } from './types/rhyme';
export type { LyricalQuantification, VowelStat, BarMetric, LiteraryDeviceStats } from './types/quantification';