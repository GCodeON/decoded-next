'use client'
import { useState, useEffect, useCallback } from 'react';
import { useSongLyrics, cleanTrackName, mstoSeconds, htmlToLyrics, lyricsToHtml, SavedSong, songService, useLrcLibPublish } from '@/modules/lyrics';
import { replaceLyricsInLrc, validateLyricsConsistency } from '@/modules/lyrics/utils/lrc-replace';
import { SpotifyTrack } from '@/modules/spotify';
import { repairSyncedLyrics, extractPlainLinesFromHtml } from '@/modules/lyrics/utils/repair';
import { parseLrcForEditing } from '@/modules/lyrics/utils/lrc';

interface UseSavedSongParams {
  track: SpotifyTrack | null;
  trackId: string;
}

/**
 * Detects word-level differences between two texts
 * Returns array of {oldWord, newWord, lineNumber} for changed words
 */
function detectTextChanges(oldPlain: string, newPlain: string): Array<{ oldWord: string; newWord: string; lineNumber: number }> {
  const oldLines = oldPlain.split('\n');
  const newLines = newPlain.split('\n');
  const changes: Array<{ oldWord: string; newWord: string; lineNumber: number }> = [];

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine === newLine) continue;

    // Split into words and find differences
    const oldWords = oldLine.split(/\s+/).filter(w => w.length > 0);
    const newWords = newLine.split(/\s+/).filter(w => w.length > 0);

    for (let j = 0; j < Math.max(oldWords.length, newWords.length); j++) {
      const oldWord = oldWords[j] || '';
      const newWord = newWords[j] || '';

      if (oldWord !== newWord && oldWord && newWord) {
        changes.push({ oldWord, newWord, lineNumber: i });
      }
    }
  }

  return changes;
}

/**
 * Counts occurrences of a word in text with exact case and word boundaries
 */
function countWordOccurrences(text: string, word: string): number {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
  return (text.match(regex) || []).length;
}

/**
 * Finds which lines contain a specific word (case-sensitive, whole word match)
 */
function findLinesWithWord(lrcContent: string, word: string): number[] {
  const lines = lrcContent.split('\n');
  const lineNumbers: number[] = [];

  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`);

  lines.forEach((line, idx) => {
    // Remove timestamps to get clean text
    const cleanText = line
      .replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')
      .replace(/<\d+:\d+(?:\.\d+)?>/g, '')
      .trim();

    if (regex.test(cleanText)) {
      lineNumbers.push(idx);
    }
  });

  return lineNumbers;
}

export function useSavedSong({ track, trackId }: UseSavedSongParams) {
  const [savedSong, setSavedSong] = useState<SavedSong | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shouldFetchLyrics, setShouldFetchLyrics] = useState(false);

  const artistName = track?.artists[0]?.name || '';
  const trackName = track?.name || '';

  const { publishIfReady } = useLrcLibPublish({ trackId, track });

  // Only call useSongLyrics if we need to fetch new lyrics
  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useSongLyrics(
    shouldFetchLyrics ? artistName : '',
    shouldFetchLyrics ? cleanTrackName(trackName) : '',
    shouldFetchLyrics ? track?.album.name || '' : '',
    shouldFetchLyrics ? mstoSeconds(track?.duration_ms || 0) : 0
  );

  // Load from Firestore
  useEffect(() => {
    if (!track || !trackId) return;

    const load = async () => {
      const data = await songService.getSong(trackId);

      if (data) {
        setSavedSong({
          title: data.title || cleanTrackName(track.name),
          artist: data.artist || artistName,
          spotify: trackId,
          lyrics: {
            plain: data.lyrics?.plain || '',
            synced: data.lyrics?.synced || null,
            wordSynced: data.lyrics?.wordSynced || null,
            rhymeEncoded: data.lyrics?.rhymeEncoded || lyricsToHtml(data.lyrics?.plain || ''),
          },
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

    const saveNew = async () => {
      setIsSaving(true);
      const plain = lyricsData.lyrics.plain?.trim() || '';
      const synced = lyricsData.lyrics.synced?.trim() || null;
      const rhymeEncoded = lyricsToHtml(plain);

      const newSong: SavedSong = {
        title: cleanTrackName(track.name),
        artist: artistName,
        spotify: trackId,
        lyrics: { plain, synced, wordSynced: null, rhymeEncoded },
      };

      try {
        await songService.saveSong(trackId, newSong);
        setSavedSong(newSong);
        setShouldFetchLyrics(false);
      } catch (err) {
        console.error('Failed to save new song:', err);
      } finally {
        setIsSaving(false);
      }
    };

    saveNew();
  }, [lyricsData, savedSong, track, trackId, artistName]);

  const updateLyrics = useCallback(
    async (htmlContent: string) => {
      if (!savedSong) return;

      const plain = htmlToLyrics(htmlContent);
      const oldPlain = savedSong.lyrics.plain;

      // Check if line count changed (e.g., user removed blank lines in editor)
      const newLineCount = extractPlainLinesFromHtml(htmlContent).length;
      const oldSyncedLineCount = savedSong.lyrics.synced ? parseLrcForEditing(savedSong.lyrics.synced).length : 0;
      const lineCountChanged = savedSong.lyrics.synced && newLineCount !== oldSyncedLineCount;

      // Prepare synced/wordSynced updates
      let updatedSynced = savedSong.lyrics.synced;
      let updatedWordSynced = savedSong.lyrics.wordSynced;
      let autoRepaired = false;

      // If line count changed, use auto-repair to realign timestamps
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
        // No line count change - use existing word-level replacement logic
        const changes = detectTextChanges(oldPlain, plain);

        // Apply text replacements to synced/wordSynced versions
        if (changes.length > 0) {
        for (const change of changes) {
          const { oldWord, newWord } = change;

          // Find all lines containing the old word
          const oldWordCount = countWordOccurrences(oldPlain, oldWord);
          const newWordCount = countWordOccurrences(plain, newWord);

          // Only proceed with replacement if counts match (word was edited, not added/removed)
          if (oldWordCount === newWordCount && oldWordCount === 1) {
            // Single occurrence - replace everywhere
            if (updatedSynced) {
              const syncedResult = replaceLyricsInLrc(updatedSynced, oldWord, newWord);
              updatedSynced = syncedResult.updated;
            }
            if (updatedWordSynced) {
              const wordSyncedResult = replaceLyricsInLrc(updatedWordSynced, oldWord, newWord);
              updatedWordSynced = wordSyncedResult.updated;
            }
          } else if (oldWordCount > 1 && oldWordCount === newWordCount) {
            // Multiple occurrences - replace only on the changed line
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

      // Validate consistency (skip if auto-repaired since repair handles this)
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
        // Update all fields together for consistency
        await songService.updateLyrics(trackId, plain, htmlContent, updatedSynced, updatedWordSynced);
        
        if (autoRepaired) {
          console.log('✅ Synced/wordSynced auto-repaired to match new line count');
        }
      } catch (err) {
        console.error('Failed to update lyrics:', err);
      }
    },
    [savedSong, trackId]
  );

  const updateSynced = useCallback(
    async (syncedLrc: string) => {
      if (!savedSong) return;

      const trimmed = syncedLrc.trim() || null;
      const updated = {
        ...savedSong,
        lyrics: { ...savedSong.lyrics, synced: trimmed },
      };

      setSavedSong(updated);

      try {
        await songService.updateSyncedLyrics(trackId, trimmed);
        if (trimmed) {
          await publishIfReady(savedSong, trimmed);
        }
      } catch (err) {
        console.error('Failed to update synced lyrics:', err);
      }
    },
    [savedSong, trackId, publishIfReady]
  );

  const updateWordSynced = useCallback(
    async (wordSyncedLrc: string) => {
      if (!savedSong) return;

      const trimmed = wordSyncedLrc.trim() || null;
      const updated = {
        ...savedSong,
        lyrics: { ...savedSong.lyrics, wordSynced: trimmed },
      };

      setSavedSong(updated);

      try {
        await songService.updateWordSyncedLyrics(trackId, trimmed);
      } catch (err) {
        console.error('Failed to update word-synced lyrics:', err);
      }
    },
    [savedSong, trackId]
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