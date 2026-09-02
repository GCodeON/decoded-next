import { useMemo } from 'react';
import { lyricsToHtml, mapLrcToRhymeHtml, SavedSong } from '@/modules/lyrics';
import { extractPlainLinesFromHtml, repairLineSyncedLyrics } from '@/modules/lyrics/utils/repair';
import { parseLrcForEditing } from '@/modules/lyrics/utils/lrc';

export type LyricsForDisplay = SavedSong['lyrics'] & { rhymeEncodedLines?: string[] };

export function useDisplayLyrics(savedSong: SavedSong | null): LyricsForDisplay | null {
  return useMemo(() => {
    if (!savedSong?.lyrics) return null;
    const lyrics: LyricsForDisplay = {
      ...savedSong.lyrics,
      rhymeEncodedLines: undefined,
    };

    if (lyrics.synced && lyrics.rhymeEncoded) {
      lyrics.rhymeEncodedLines = mapLrcToRhymeHtml(lyrics.synced, lyrics.rhymeEncoded);
    }

    if (!lyrics.rhymeEncoded) {
      lyrics.rhymeEncoded = savedSong.lyrics.rhymeEncoded || lyricsToHtml(savedSong.lyrics.plain);
    }

    if (
      lyrics.synced &&
      lyrics.rhymeEncoded &&
      parseLrcForEditing(lyrics.synced).length !== extractPlainLinesFromHtml(lyrics.rhymeEncoded).length
    ) {
      lyrics.synced = repairLineSyncedLyrics(lyrics.rhymeEncoded, lyrics.synced);
    }

    if (
      lyrics.wordSynced &&
      !/<\d+:/i.test(lyrics.wordSynced) &&
      lyrics.synced &&
      parseLrcForEditing(lyrics.wordSynced).length !== parseLrcForEditing(lyrics.synced).length
    ) {
      lyrics.wordSynced = lyrics.synced;
    }

    if (lyrics.synced && lyrics.rhymeEncoded) {
      lyrics.rhymeEncodedLines = mapLrcToRhymeHtml(lyrics.synced, lyrics.rhymeEncoded);
    }

    return lyrics;
  }, [savedSong]);
}
