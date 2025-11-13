'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { FaEdit, FaSave, FaTimes, FaPlayCircle, FaPauseCircle } from 'react-icons/fa';

import { useSpotifyApi } from '@/hooks/useSpotifyApi';
import { useLyrics } from '@/hooks/useLyrics';
import { htmlToLyrics, lyricsToHtml } from '@/utils/lyrics';
import { cleanTrackName, mstoSeconds } from '@/utils/track';

// === Types ===
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
    release_date: string;
  };
  duration_ms: number;
}
interface SavedSong {
  title: string;
  artist: string;
  spotify: string;
  lyrics: {
    plain: string;
    synced: string | null;
    rhymeEncoded: string;
  };
}
interface SyncedLine {
  time: number;
  text: string;
  element: HTMLDivElement | null;
}

// === Custom Hooks ===
function useSpotifyTrack(trackId: string) {
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
  }, [trackId]);

  return { track, error, loading };
}

function useSavedSong(track: SpotifyTrack | null, trackId: string) {
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

  return {
    savedSong,
    isSaving,
    lyricsLoading,
    lyricsError,
    updateLyrics,
  };
}

function usePlaybackSync(trackId: string, enabled: boolean) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { spotifyApi } = useSpotifyApi();

  useEffect(() => {
    if (!enabled) return;

    const pollPlayback = async () => {
      try {
        const data = await spotifyApi(`/me/player`);
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
  }, [trackId, enabled]);

  return { isPlaying, currentPosition, togglePlayback: () => {} };
}

// === Components ===
function SongHeader({ track, isPlaying }: { track: SpotifyTrack; isPlaying: boolean }) {
  return (
    <div className="flex items-center space-x-6 bg-white rounded-xl shadow-lg p-6">
      <div className="relative w-48 h-48 flex-shrink-0">
        <Image
          src={track.album.images[0]?.url || '/placeholder.png'}
          alt={track.name}
          fill
          className="rounded-lg object-cover"
        />
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900">{track.name}</h1>
        <p className="text-xl text-gray-600 mt-1">
          {track.artists.map((a) => a.name).join(', ')}
        </p>
        <p className="text-sm text-gray-500 mt-2">Album: {track.album.name}</p>
        <p className="text-sm text-gray-500">
          Released: {new Date(track.album.release_date).getFullYear()}
        </p>
      </div>

      <button
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="text-green-500 hover:text-green-600 transition"
      >
        {isPlaying ? <FaPauseCircle size={48} /> : <FaPlayCircle size={48} />}
      </button>
    </div>
  );
}

function SyncedLyrics({
  syncedLyrics,
  currentPosition,
  isPlaying,
}: {
  syncedLyrics: string;
  currentPosition: number;
  isPlaying: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SyncedLine[]>([]);

  const lines = useMemo(() => {
    return syncedLyrics
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && /^\[/.test(line))
      .map((line) => {
        const m = line.match(/\[(\d+):(\d+\.\d+|\d+)\](.*)/);
        if (!m) return null;
        const [, mins, secs, txt] = m;
        const time = parseInt(mins) * 60 + parseFloat(secs);
        return { time, text: txt.trim(), element: null as HTMLDivElement | null };
      })
      .filter(Boolean) as SyncedLine[];
  }, [syncedLyrics]);

  // Update DOM references
  useEffect(() => {
    linesRef.current = lines;
    requestAnimationFrame(() => {
      const els = containerRef.current?.querySelectorAll('.synced-line');
      els?.forEach((el, i) => {
        if (lines[i]) lines[i].element = el as HTMLDivElement;
      });
    });
  }, [lines]);

  // Scroll to active line
  useEffect(() => {
    if (!isPlaying || linesRef.current.length === 0) return;

    const active = linesRef.current.filter((l) => currentPosition >= l.time).pop();
    if (!active?.element) return;

    const container = containerRef.current!;
    const line = active.element;

    // Highlight
    container.querySelectorAll('.synced-line').forEach((el) => {
      el.classList.toggle('active', el === line);
    });

    // Smooth scroll
    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const lineCenterY = lineRect.top - containerRect.top + container.scrollTop + lineRect.height / 2;
    const targetScrollTop = lineCenterY - container.clientHeight / 2;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

    if (Math.abs(container.scrollTop - finalScrollTop) > 5) {
      container.scrollTo({ top: finalScrollTop, behavior: 'smooth' });
    }
  }, [currentPosition, isPlaying]);

  return (
    <div
      ref={containerRef}
      className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3"
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className="synced-line px-4 py-2 rounded-lg bg-white shadow-sm transition-all duration-300 text-black text-lg font-medium"
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}

function LyricsEditor({
  initialHtml,
  onSave,
  onCancel,
}: {
  initialHtml: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(initialHtml);

  return (
    <div className="space-y-4">
      <SunEditor
        setContents={content}
        onChange={setContent}
        setOptions={{
          height: '500px',
          buttonList: [['undo', 'redo'], ['fontColor', 'hiliteColor']],
        }}
      />
      <div className="flex gap-3">
        <button
          onClick={() => onSave(content)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <FaSave /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          <FaTimes /> Cancel
        </button>
      </div>
    </div>
  );
}

// === Main Component ===
export default function Song({ params }: { params: { id: string } }) {
  const { track, error: trackError, loading: trackLoading } = useSpotifyTrack(params.id);
  const { savedSong, isSaving, lyricsLoading, lyricsError, updateLyrics } = useSavedSong(track, params.id);
  const { isPlaying, currentPosition } = usePlaybackSync(params.id, !!track);
  const [editMode, setEditMode] = useState(false);

  const displayLyrics = useMemo(() => {
    if (savedSong?.lyrics) {
      return {
        ...savedSong.lyrics,
        rhymeEncoded: savedSong.lyrics.rhymeEncoded || lyricsToHtml(savedSong.lyrics.plain),
      };
    }
    return null;
  }, [savedSong, track]);

  const hasSynced = !!displayLyrics?.synced;
  const displayHtml = displayLyrics?.rhymeEncoded || '';

  // Loading & Error States
  if (trackLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading song...</p>
      </div>
    );
  }

  if (trackError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-red-500">Error: {trackError}</p>
      </div>
    );
  }

  if (!track) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <SongHeader track={track} isPlaying={isPlaying} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-black text-2xl font-bold">Lyrics</h2>
          {displayLyrics && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FaEdit /> Edit
            </button>
          )}
        </div>

        {/* Status Messages */}
        {isSaving && <p className="text-sm text-gray-500">Saving...</p>}
        {lyricsLoading && !savedSong && <p className="text-gray-600 animate-pulse">Searching lyrics...</p>}
        {lyricsError && !savedSong && (
          <p className="text-red-500">
            {lyricsError.includes('not found') ? 'Lyrics not available.' : `Error: ${lyricsError}`}
          </p>
        )}
        {!lyricsLoading && !displayLyrics && <p className="text-gray-500 italic">No lyrics found.</p>}

        {/* Synced View */}
        {displayLyrics && !editMode && hasSynced && (
          <SyncedLyrics
            syncedLyrics={displayLyrics.synced!}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
          />
        )}

        {/* Plain HTML View */}
        {displayLyrics && !editMode && !hasSynced && (
          <div className="prose prose-lg max-w-none">
            <div
              className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          </div>
        )}

        {hasSynced && (
          <details className="mt-6 border-t pt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
              View synced timestamps
            </summary>
            <pre className="mt-3 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {displayLyrics.synced}
            </pre>
          </details>
        )}

        {/* Editor */}
        {editMode && (
          <LyricsEditor
            initialHtml={displayHtml}
            onSave={async (html) => {
              await updateLyrics(html);
              setEditMode(false);
            }}
            onCancel={() => setEditMode(false)}
          />
        )}
      </div>
    </div>
  );
}