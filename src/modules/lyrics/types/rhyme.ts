export type RhymeSegment = {
  text: string;
  bgColor: string | null;
  textColor: string | null;
  underline: boolean;
  start: number;
  end: number;
};

export type WordRhymeParts = RhymeSegment[];

export type ParsedRhymeLine = {
  text: string;
  segments: RhymeSegment[];
};

export type RhymeColorData = {
  colorMap: Map<string, string>;
  wordPartsByLine: WordRhymeParts[][];
};

export type SyncMode = 'auto' | 'word' | 'line';

export interface SyncedLyricsProps {
  syncedLyrics: string;
  currentPositionMs: number;
  isPlaying: boolean;
  rhymeEncodedLines?: string[];
  showRhymes?: boolean;
  mode?: SyncMode;
}
