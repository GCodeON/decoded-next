export interface SavedSong {
  title: string;
  artist: string;
  spotify: string;
  lyrics: {
    plain: string;
    synced: string | null;
    rhymeEncoded: string;
    rhymeEncodedLines?: string[] | null; 
  };
}
export interface SyncedLine {
  time: number;
  text: string;
  element: HTMLDivElement | null;
  rhymeHtml?: string; 
}

export interface SyncedTrack {
  syncedLyrics: string;
  currentPosition: number;
  currentPositionMs?: number; // optional ms precision
  isPlaying: boolean;
  rhymeEncodedLines: string[] | null | undefined;
}