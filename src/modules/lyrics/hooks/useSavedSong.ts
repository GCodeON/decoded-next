'use client'
import { useState, useEffect, useCallback } from 'react';
import { useSongLyrics, cleanTrackName, mstoSeconds, htmlToLyrics, lyricsToHtml, SavedSong, songService, useLrcLibPublish } from '@/modules/lyrics';
import { SpotifyTrack } from '@/modules/spotify';

interface UseSavedSongParams {
  track: SpotifyTrack | null;
  trackId: string;
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
      const updated = {
        ...savedSong,
        lyrics: { ...savedSong.lyrics, plain, rhymeEncoded: htmlContent },
      };

      setSavedSong(updated);

      try {
        await songService.updateLyrics(trackId, plain, htmlContent);
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