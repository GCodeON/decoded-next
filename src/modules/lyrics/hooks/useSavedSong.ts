'use client'
import { useState, useEffect, useCallback } from 'react';
import { useSongLyrics, cleanTrackName, mstoSeconds, htmlToLyrics, lyricsToHtml, SavedSong, songService, useLrcLibPublish, splitLyricsIntoLines } from '@/modules/lyrics';
import { replaceLyricsInLrc, validateLyricsConsistency, detectTextChanges, countWordOccurrences, findLinesWithWord } from '@/modules/lyrics/utils/lrc-replace';
import { SpotifyTrack } from '@/modules/spotify';
import { repairSyncedLyrics, extractPlainLinesFromHtml } from '@/modules/lyrics/utils/repair';
import { parseLrcForEditing, sanitizeLrcOutput } from '@/modules/lyrics/utils/lrc';
import { sanitizeEnhancedLrcOutput } from '@/modules/lyrics/utils/lrcAdvanced';

interface UseSavedSongParams {
  track: SpotifyTrack | null;
  trackId: string;
  allowWrite?: boolean;
}

export function useSavedSong({ track, trackId, allowWrite = true }: UseSavedSongParams) {
  const [savedSong, setSavedSong] = useState<SavedSong | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shouldFetchLyrics, setShouldFetchLyrics] = useState(false);

  const artistName = track?.artists[0]?.name || '';
  const trackName = track?.name || '';

  const { publishIfReady } = useLrcLibPublish({ trackId, track });

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useSongLyrics(
    shouldFetchLyrics ? artistName : '',
    shouldFetchLyrics ? cleanTrackName(trackName) : '',
    shouldFetchLyrics ? track?.album.name || '' : '',
    shouldFetchLyrics ? mstoSeconds(track?.duration_ms || 0) : 0
  );

  const createAndSaveSong = useCallback(
    async (plain: string, rhymeEncoded: string, synced: string | null = null) => {
      if (!allowWrite) return null;
      if (!track) return null;

      setIsSaving(true);
      const newSong: SavedSong = {
        title: cleanTrackName(track.name),
        artist: artistName,
        artists: track.artists,
        spotify: trackId,
        youtubeUrl: null,
        albumImageUrl: track.album?.images?.[0]?.url ?? null,
        lyrics: { plain, synced, wordSynced: null, rhymeEncoded },
      };

      try {
        await songService.saveSong(trackId, newSong);
        setSavedSong(newSong);
        setShouldFetchLyrics(false);
        return newSong;
      } catch (err) {
        console.error('Failed to save new song:', err);
        return null;
      } finally {
        setIsSaving(false);
      }
    }, [track, trackId, artistName, allowWrite]
  );

  // Load from Firestore
  useEffect(() => {
    if (!track || !trackId) return;

    const load = async () => {
      const data = await songService.getSong(trackId);

      if (data) {
        const rawPlain = data.lyrics?.plain || '';
        const rhymeEncoded = data.lyrics?.rhymeEncoded || lyricsToHtml(rawPlain);
        const reconstructedPlain = splitLyricsIntoLines(rawPlain, rhymeEncoded).join('\n');

        setSavedSong({
          title: data.title || cleanTrackName(track.name),
          artist: data.artist || artistName,
          artists: data.artists,
          spotify: trackId,
          youtubeUrl: data.youtubeUrl || null,
          albumImageUrl: data.albumImageUrl || track.album?.images?.[0]?.url || null,
          lyrics: {
            plain: reconstructedPlain || rawPlain,
            synced: sanitizeLrcOutput(data.lyrics?.synced || null),
            wordSynced: sanitizeEnhancedLrcOutput(data.lyrics?.wordSynced || null),
            rhymeEncoded,
            rhymeEncodedLines: data.lyrics?.rhymeEncodedLines || null,
            rhymeColorMappingComplete: data.lyrics?.rhymeColorMappingComplete || false,
          },
          leadAdjustmentMs: data.leadAdjustmentMs || 0,
        });
        setShouldFetchLyrics(false); // Song exists, no need to fetch
      } else {
        // Song doesn't exist in Firebase, fetch lyrics
        setShouldFetchLyrics(true);
      }
    };

    load();
  }, [track, trackId, artistName]);

  // Auto-save when lyrics are found and song doesn't exist yet
  useEffect(() => {
    if (!lyricsData || savedSong || !track) return;

    const lyricsPayload = (lyricsData as { lyrics?: { plain?: string | null; synced?: string | null } }).lyrics;
    if (!lyricsPayload) {
      setShouldFetchLyrics(false);
      return;
    }

    const plain = lyricsPayload.plain?.trim() || '';
    const synced = lyricsPayload.synced?.trim() || null;
    const rhymeEncoded = lyricsToHtml(plain);

    if (!allowWrite) {
      setSavedSong({
        title: cleanTrackName(track.name),
        artist: artistName,
        artists: track.artists,
        spotify: trackId,
        youtubeUrl: null,
        lyrics: { plain, synced, wordSynced: null, rhymeEncoded },
      });
      setShouldFetchLyrics(false);
      return;
    }

    createAndSaveSong(plain, rhymeEncoded, synced);
  }, [lyricsData, savedSong, track, createAndSaveSong, allowWrite, artistName, trackId]);

  const updateLyrics = useCallback(
    async (htmlContent: string) => {
      if (!allowWrite) return;

      const plain = htmlToLyrics(htmlContent);

      // If no savedSong exists, create a new one
      if (!savedSong) {
        await createAndSaveSong(plain, htmlContent, null);
        return;
      } 
      const oldPlain = savedSong.lyrics.plain;

      const newLineCount = extractPlainLinesFromHtml(htmlContent).length;
      const oldSyncedLineCount = savedSong.lyrics.synced ? parseLrcForEditing(savedSong.lyrics.synced).length : 0;
      const lineCountChanged = savedSong.lyrics.synced && newLineCount !== oldSyncedLineCount;

      let updatedSynced = savedSong.lyrics.synced;
      let updatedWordSynced = savedSong.lyrics.wordSynced;
      let autoRepaired = false;


      if (lineCountChanged) {
        console.log(`Line count changed: ${oldSyncedLineCount} → ${newLineCount}. Auto-repairing synced/wordSynced...`);
        const repairResult = await repairSyncedLyrics(
          htmlContent,
          savedSong.lyrics.synced || '',
          savedSong.lyrics.wordSynced || null
        );
        updatedSynced = repairResult.repairedSynced;
        updatedWordSynced = repairResult.repairedWordSynced;
        autoRepaired = true;
      } else {
       
        const changes = detectTextChanges(oldPlain, plain);

        if (changes.length > 0) {
        for (const change of changes) {
          const { oldWord, newWord } = change;


          const oldWordCount = countWordOccurrences(oldPlain, oldWord);
          const newWordCount = countWordOccurrences(plain, newWord);


          if (oldWordCount === newWordCount && oldWordCount === 1) {

            if (updatedSynced) {
              const syncedResult = replaceLyricsInLrc(updatedSynced, oldWord, newWord);
              updatedSynced = syncedResult.updated;
            }
            if (updatedWordSynced) {
              const wordSyncedResult = replaceLyricsInLrc(updatedWordSynced, oldWord, newWord);
              updatedWordSynced = wordSyncedResult.updated;
            }
          } else if (oldWordCount > 1 && oldWordCount === newWordCount) {

            const changedLineNumbers = findLinesWithWord(oldPlain, oldWord);
            if (changedLineNumbers.length > 0) {
              if (updatedSynced) {
                const syncedResult = replaceLyricsInLrc(updatedSynced, oldWord, newWord, changedLineNumbers);
                updatedSynced = syncedResult.updated;
              }
              if (updatedWordSynced) {
                const wordSyncedResult = replaceLyricsInLrc(updatedWordSynced, oldWord, newWord, changedLineNumbers);
                updatedWordSynced = wordSyncedResult.updated;
              }
            }
          }
        }
        }
      }

      if (!autoRepaired) {
        const syncConsistency = validateLyricsConsistency(plain, updatedSynced || null);
        const wordSyncConsistency = validateLyricsConsistency(plain, updatedWordSynced || null);

        if (!syncConsistency.isConsistent && updatedSynced) {
          console.warn(
            `Synced lyrics consistency check: plain has ${syncConsistency.plainWordCount} words, synced has ${syncConsistency.syncedWordCount} words (tolerance: ${syncConsistency.tolerance})`
          );
        }
        if (!wordSyncConsistency.isConsistent && updatedWordSynced) {
          console.warn(
            `Word-synced lyrics consistency check: plain has ${wordSyncConsistency.plainWordCount} words, synced has ${wordSyncConsistency.syncedWordCount} words (tolerance: ${wordSyncConsistency.tolerance})`
          );
        }
      }

      const updated = {
        ...savedSong,
        lyrics: {
          ...savedSong.lyrics,
          plain,
          rhymeEncoded: htmlContent,
          synced: updatedSynced,
          wordSynced: updatedWordSynced,
        },
      };

      setSavedSong(updated);

      try {

        await songService.updateLyrics(trackId, plain, htmlContent, updatedSynced, updatedWordSynced);
        
        if (autoRepaired) {
          console.log('✅ Synced/wordSynced auto-repaired to match new line count');
        }
      } catch (err) {
        console.error('Failed to update lyrics:', err);
      }
    },
    [savedSong, trackId, allowWrite]
  );

  const updateSynced = useCallback(
    async (syncedLrc: string) => {
      if (!allowWrite) return;
      if (!savedSong) return;

      const trimmed = syncedLrc.trim() || null;
      const sanitized = sanitizeLrcOutput(trimmed);
      const updated = {
        ...savedSong,
        lyrics: { ...savedSong.lyrics, synced: sanitized },
      };

      setSavedSong(updated);

      try {
        await songService.updateSyncedLyrics(trackId, sanitized);
        if (sanitized) {
          await publishIfReady(savedSong, sanitized);
        }
      } catch (err) {
        console.error('Failed to update synced lyrics:', err);
      }
    },
    [savedSong, trackId, publishIfReady, allowWrite]
  );

  const updateWordSynced = useCallback(
    async (wordSyncedLrc: string) => {
      if (!allowWrite) return;
      if (!savedSong) return;

      const trimmed = wordSyncedLrc.trim() || null;
      const sanitized = sanitizeEnhancedLrcOutput(trimmed);
      const updated = {
        ...savedSong,
        lyrics: { ...savedSong.lyrics, wordSynced: sanitized },
      };

      setSavedSong(updated);

      try {
        await songService.updateWordSyncedLyrics(trackId, sanitized);
      } catch (err) {
        console.error('Failed to update word-synced lyrics:', err);
      }
    },
    [savedSong, trackId, allowWrite]
  );

  return {
    savedSong,
    isSaving,
    lyricsLoading,
    lyricsError,
    updateLyrics,
    updateSynced,
    updateWordSynced,
  };
}