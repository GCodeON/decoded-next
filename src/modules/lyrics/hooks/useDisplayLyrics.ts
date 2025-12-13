import { useMemo } from 'react';
import { lyricsToHtml, mapLrcToRhymeHtml, SavedSong } from '@/modules/lyrics';

export type LyricsForDisplay = SavedSong['lyrics'] & { rhymeEncodedLines?: string[] };

export function useDisplayLyrics(savedSong: SavedSong | null): LyricsForDisplay | null {
  return useMemo(() => {
    if (!savedSong?.lyrics) return null;
    const lyrics: LyricsForDisplay = {
      ...savedSong.lyrics,
      rhymeEncodedLines: savedSong.lyrics.rhymeEncodedLines ?? undefined,
    };

    if (lyrics.synced && lyrics.rhymeEncoded && !lyrics.rhymeEncodedLines) {
      lyrics.rhymeEncodedLines = mapLrcToRhymeHtml(lyrics.synced, lyrics.rhymeEncoded);
    }

    if (!lyrics.rhymeEncoded) {
      lyrics.rhymeEncoded = savedSong.lyrics.rhymeEncoded || lyricsToHtml(savedSong.lyrics.plain);
    }

    return lyrics;
  }, [savedSong]);
}
