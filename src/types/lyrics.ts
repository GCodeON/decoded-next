export interface LyricsResult {
  title: string;
  lyrics: {
    plain: string;
    synced: string | null;
    rhymeEncoded: string;
  };
}

export interface LyricsResponse {
  title: string;
  lyrics: {
    plain: string | null;
    synced: string | null;
  };
}

export interface LrcLibData {
  syncedLyrics?: string;
  plainLyrics?: string;
}