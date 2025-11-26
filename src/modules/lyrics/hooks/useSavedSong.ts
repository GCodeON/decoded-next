import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

import { useSongLyrics, cleanTrackName, mstoSeconds, htmlToLyrics, lyricsToHtml, SavedSong } from '@/modules/lyrics/';
import { SpotifyTrack } from '@/modules/spotify/types/spotify';

interface UseSavedSongParams {
  track: SpotifyTrack | null;
  trackId: string;
}

export function useSavedSong({ track, trackId }: UseSavedSongParams) {
  const [savedSong, setSavedSong] = useState<SavedSong | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const artistName = track?.artists[0]?.name || '';
  const trackName = track?.name || '';

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useSongLyrics(
    artistName,
    cleanTrackName(trackName),
    track?.album.name || '',
    mstoSeconds(track?.duration_ms || 0)
  );

  // Load from Firestore
  useEffect(() => {
    if (!track || !trackId) return;

    const load = async () => {
      const ref = doc(db, 'songs', trackId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setSavedSong({
          title: data.title || cleanTrackName(track.name),
          artist: data.artist || artistName,
          spotify: trackId,
          lyrics: {
            plain: data.lyrics?.plain || '',
            synced: data.lyrics?.synced || null,
            rhymeEncoded: data.lyrics?.rhymeEncoded || lyricsToHtml(data.lyrics?.plain || ''),
          },
        });
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
        lyrics: { plain, synced, rhymeEncoded },
      };

      try {
        await setDoc(doc(db, 'songs', trackId), newSong);
        setSavedSong(newSong);
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
        await updateDoc(doc(db, 'songs', trackId), {
          'lyrics.plain': plain,
          'lyrics.rhymeEncoded': htmlContent,
        });
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
        await updateDoc(doc(db, 'songs', trackId), {
          'lyrics.synced': trimmed,
        });
      } catch (err) {
        console.error('Failed to update synced lyrics:', err);
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
  };
}