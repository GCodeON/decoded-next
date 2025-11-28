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
  const [shouldFetchLyrics, setShouldFetchLyrics] = useState(false);

  const artistName = track?.artists[0]?.name || '';
  const trackName = track?.name || '';

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
        lyrics: { plain, synced, rhymeEncoded },
      };

      try {
        await setDoc(doc(db, 'songs', trackId), newSong);
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
        // Background publish to LrcLib when fully synced
        if (trimmed && isFullyStamped(trimmed)) {
          // Compute signature to avoid duplicate publishes
          const sigInput = `${artistName}|${cleanTrackName(track!.name)}|${track!.album.name}|${track!.duration_ms}|${trimmed}`;
          const sigBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sigInput));
          const sigHex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

          // If already published with same signature, skip
          const existingSig = (savedSong as any)?.lrclib?.signature;
          const wasPublished = (savedSong as any)?.lrclib?.published;
          if (wasPublished && existingSig && existingSig === sigHex) {
            return;
          }

          const body = {
            trackName: cleanTrackName(track!.name),
            artistName: artistName,
            albumName: track!.album.name,
            durationMs: track!.duration_ms,
            plainLyrics: savedSong!.lyrics.plain,
            syncedLyrics: trimmed,
          };
          // Fire-and-forget: do not await publish; keep UI responsive
          void (async () => {
            try {
              const res = await fetch('/api/lyrics/lrclib/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                keepalive: true as any,
              });
              if (res.ok) {
                const now = Date.now();
                await updateDoc(doc(db, 'songs', trackId), {
                  'lrclib.published': true,
                  'lrclib.signature': sigHex,
                  'lrclib.lastPublishedAt': now,
                });
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('lrclib:published', { detail: { trackId } }));
                }
              }
            } catch (e) {
              console.error('Background publish failed', e);
            }
          })();
        }
      } catch (err) {
        console.error('Failed to update synced lyrics:', err);
      }
    },
    [savedSong, trackId]
  );

  function isFullyStamped(lrc: string) {
    const ts = /^\[\d{2}:\d{2}(?:\.\d{2})?]/;
    return lrc
      .split(/\r?\n/)
      .filter(Boolean)
      .every((ln) => !ln.trim() || ts.test(ln));
  }

  return {
    savedSong,
    isSaving,
    lyricsLoading,
    lyricsError,
    updateLyrics,
    updateSynced,
  };
}