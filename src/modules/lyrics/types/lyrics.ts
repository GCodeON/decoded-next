export interface LyricsResult {
  title: string;
  lyrics: {
    plain: string;
    synced: string | null;
    wordSynced?: string | null;
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

export type LyricsSearchParams = {
  artistName: string;
  trackName: string;
  albumName: string;
  duration: string;
};

export type PublishPayload = {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics?: string;
  syncedLyrics?: string;
};

export type GetLyricsResult =
  | { success: true; data: LrcLibData }
  | { success: false; error: 'not_found' | 'timeout' | 'invalid_response'; details?: unknown };

export type PublishResult =
  | { success: true; id?: string }
  | { success: false; error: 'challenge_failed' | 'pow_timeout' | 'publish_failed'; details?: unknown };

export type ChallengeData = {
  prefix: string;
  target: string;
};