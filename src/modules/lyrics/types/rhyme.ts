export type RhymeSegment = {
  text: string;
  color: string | null;
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

export type AnimationStyle = 'cursor' | 'scale' | 'hybrid';
export type SyncMode = 'auto' | 'word' | 'line';

export interface SyncedLyricsProps {
  syncedLyrics: string;
  currentPositionMs: number;
  isPlaying: boolean;
  rhymeEncodedLines?: string[];
  showRhymes?: boolean;
  mode?: SyncMode;
  animationStyle?: AnimationStyle;
}
