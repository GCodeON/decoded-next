import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

import { useSpotifyApi } from '@/hooks/useSpotifyApi';
import { useLyrics } from '@/hooks/useLyrics';
import { useSpotifyPlayer } from '@/context/SpotifyPlayerContext';

import { cleanTrackName, mstoSeconds } from '@/utils/track';
import { htmlToLyrics, lyricsToHtml } from '@/utils/lyrics';

import { SpotifyTrack } from '@/types/spotify';
import { SavedSong } from '@/types/track';

export function useSpotifyTrack(trackId: string) {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { spotifyApi } = useSpotifyApi();

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await spotifyApi(`/tracks/${trackId}`);
        setTrack(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load song');
      } finally {
        setLoading(false);
      }
    };
    fetchTrack();
  }, [trackId, spotifyApi]);

  return { track, error, loading };
}

export function useSavedSong(track: SpotifyTrack | null, trackId: string) {
  const [savedSong, setSavedSong] = useState<SavedSong | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const artistName = track?.artists[0]?.name || '';
  const trackName = track?.name || '';

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useLyrics(
    artistName,
    cleanTrackName(trackName),
    track?.album.name || '',
    mstoSeconds(track?.duration_ms || 0)
  );

  // Load existing song from Firestore
  useEffect(() => {
    if (!track) return;

    const loadSavedSong = async () => {
      const songRef = doc(db, 'songs', trackId);
      const snapshot = await getDoc(songRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const plain = data.lyrics?.plain || '';
        const synced = data.lyrics?.synced || null;
        const rhymeEncoded = data.lyrics?.rhymeEncoded || lyricsToHtml(plain);

        setSavedSong({
          title: data.title || cleanTrackName(track.name),
          artist: data.artist || artistName,
          spotify: trackId,
          lyrics: { plain, synced, rhymeEncoded },
        });
      }
    };

    loadSavedSong();
  }, [track, trackId, artistName]);

  // Save new song if lyrics found and not saved
  useEffect(() => {
    if (!lyricsData || savedSong || !track) return;

    const saveNewSong = async () => {
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
        console.error('Failed to save:', err);
      } finally {
        setIsSaving(false);
      }
    };

    saveNewSong();
  }, [lyricsData, savedSong, track, trackId, artistName]);

  const updateLyrics = useCallback(
    async (htmlContent: string) => {
      if (!savedSong) return;

      const plainTextLyrics = htmlToLyrics(htmlContent);
      const updated: SavedSong = {
        ...savedSong,
        lyrics: {
          ...savedSong.lyrics,
          plain: plainTextLyrics,
          rhymeEncoded: htmlContent,
        },
      };

      setSavedSong(updated);

      try {
        await updateDoc(doc(db, 'songs', trackId), {
          'lyrics.plain': plainTextLyrics,
          'lyrics.rhymeEncoded': htmlContent,
        });
      } catch (err) {
        console.error('Update failed:', err);
      }
    },
    [savedSong, trackId]
  );

  const updateSynced = useCallback(
    async (syncedLrc: string) => {
      if (!savedSong) return;

      const updated: SavedSong = {
        ...savedSong,
        lyrics: {
          ...savedSong.lyrics,
          synced: syncedLrc.trim() || null,
        },
      };

      setSavedSong(updated);

      try {
        await updateDoc(doc(db, 'songs', trackId), {
          'lyrics.synced': syncedLrc.trim() || null,
        });
      } catch (err) {
        console.error('Failed to save synced lyrics:', err);
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
    updateSynced
  };
}

export function usePlaybackSync(trackId: string, enabled: boolean) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { spotifyApi } = useSpotifyApi();
  const { deviceId, webLastPosition, webLastTrack, setLastExternalDevice, setWebLastPosition, setWebLastTrack } = useSpotifyPlayer();

  const togglePlayback = useCallback(async () => {
    try {
      if (isPlaying) {
        await spotifyApi('/me/player/pause', {
          method: 'PUT',
        });
      } else {

        let targetDevice;
        try {
          const devicesRes = await spotifyApi('/me/player/devices');
        
          if (devicesRes && Array.isArray(devicesRes.devices)) {
            const activeDevice = devicesRes.devices.find((d: any) => d.is_active === true);
            targetDevice = activeDevice.id;
          }
        } catch (e) {
          // ignore devices lookup errors and fall through to web player fallback
        }

        let startSeconds = currentPosition;
        try {
          if ((!startSeconds || startSeconds === 0)) {
            if (webLastTrack === trackId && typeof webLastPosition === 'number') {
              startSeconds = webLastPosition;
            }
          }
        } catch (e) {

        }

        const playEndpoint = targetDevice ? `/me/player/play?device_id=${encodeURIComponent(targetDevice)}` :  `/me/player/play?device_id=${encodeURIComponent(deviceId)}`;
        await spotifyApi(playEndpoint, {
          method: 'PUT',
          body: {
            uris: [`spotify:track:${trackId}`],
            position_ms: Math.floor((startSeconds || 0) * 1000),
          },
        });
      }
    } catch (err: any) {
      console.error('Playback toggle failed:', err.message);
    }
  }, [isPlaying, currentPosition, trackId, spotifyApi, deviceId, webLastPosition, webLastTrack]);

  useEffect(() => {
    if (!enabled) return;

    const pollPlayback = async () => {
      try {
        const data = await spotifyApi(`/me/player`);
        try {
          if (data?.device?.id) {
            const currentDeviceId = data.device.id;
            if (currentDeviceId) {
              if (deviceId && currentDeviceId === deviceId) {
                try {
                  if (typeof data.progress_ms === 'number') {
                    setWebLastPosition(Math.floor(data.progress_ms / 1000));
                  }
                  if (data?.item?.id) {
                    setWebLastTrack(data.item.id);
                  }
                } catch (e) {}
              } else {
                try {
                  setLastExternalDevice(currentDeviceId);
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          console.log('Playback poll device handling error:', e);
        }
        if (data?.item?.id === trackId) {
          setIsPlaying(data.is_playing);
          setCurrentPosition(data.progress_ms / 1000);
        } else {
          setIsPlaying(false);
          setCurrentPosition(0);
        }
      } catch (err) {
        console.error('Playback poll failed:', err);
      }
    };

    pollPlayback();
    pollIntervalRef.current = setInterval(pollPlayback, 1000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [trackId, enabled, spotifyApi, deviceId, setLastExternalDevice, setWebLastPosition, setWebLastTrack]);

  return { isPlaying, currentPosition, togglePlayback };
}