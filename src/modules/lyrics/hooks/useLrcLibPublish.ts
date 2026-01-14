'use client'
import { useCallback } from 'react';
import { songService, computeSignature, cleanTrackName, isFullyStamped, SavedSong } from '@/modules/lyrics';
import { SpotifyTrack } from '@/modules/spotify';

interface UseLrcLibPublishParams {
  trackId: string;
  track: SpotifyTrack | null;
}

export function useLrcLibPublish({ trackId, track }: UseLrcLibPublishParams) {
  const publishIfReady = useCallback(
    async (savedSong: SavedSong, syncedLrc: string) => {
      if (!track || !isFullyStamped(syncedLrc)) return;

      const artistName = track.artists[0]?.name || '';
      
      // Compute signature to avoid duplicate publishes
      const sigInput = `${artistName}|${cleanTrackName(track.name)}|${track.album.name}|${track.duration_ms}|${syncedLrc}`;
      const signature = await computeSignature(sigInput);

      // Skip if already published with same signature
      const existingSig = (savedSong as any)?.lrclib?.signature;
      const wasPublished = (savedSong as any)?.lrclib?.published;
      if (wasPublished && existingSig === signature) {
        return;
      }

      const payload = {
        trackName: cleanTrackName(track.name),
        artistName,
        albumName: track.album.name,
        durationMs: track.duration_ms,
        plainLyrics: savedSong.lyrics.plain,
        syncedLyrics: syncedLrc,
      };

      void (async () => {
        try {
          const res = await fetch('/api/lyrics/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true as any,
          });

          if (res.ok) {
            const now = Date.now();
            await songService.updatePublishMetadata(trackId, signature, now);

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('lrclib:published', { detail: { trackId } })
              );
            }
          }
        } catch (e) {
          console.error('Background publish failed', e);
        }
      })();
    },
    [trackId, track]
  );

  return { publishIfReady };
}
