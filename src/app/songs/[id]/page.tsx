'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase-config';

import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { FaEdit, FaSave, FaTimes, FaPlayCircle, FaPauseCircle } from 'react-icons/fa';

import { spotifyApi } from '@/hooks/spotify';
import { useLyrics } from '@/hooks/useLyrics';

import { htmlToLyrics, lyricsToHtml } from '@/utils/lyrics';
import { cleanTrackName, mstoSeconds } from '@/utils/track';


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

export default function Song({ params }: { params: { id: string } }) {
  const [spotifyTrack, setSpotifyTrack] = useState<any>(null);
  const [savedSong, setSavedSong] = useState<SavedSong | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const syncedLinesRef = useRef<SyncedLine[]>([]);

  const artistName = spotifyTrack?.artists?.[0]?.name || '';
  const trackName = spotifyTrack?.name || '';
  const albumName = spotifyTrack?.album.name || '';
  const trackDuration = spotifyTrack?.duration_ms || '';

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useLyrics(
    artistName,
    cleanTrackName(trackName),
    albumName,
    mstoSeconds(trackDuration)
  );

  const toggleEdit = () => setEditMode(prev => !prev);
  
  const togglePlayback = () => {
    console.log('onClick Play');
  }

  useEffect(() => {
    const getSong = async () => {
      try {
        setFetchError(null);
        const data = await spotifyApi(`/tracks/${params.id}`);
        setSpotifyTrack(data);
      } catch (err: any) {
        console.error('Failed to fetch song:', err);
        setFetchError(err.message || 'Failed to load song');
      }
    };
    getSong();
  }, [params.id]);

  useEffect(() => {
    if (!spotifyTrack) return;

    const findOrCreateSong = async () => {
      const songRef = doc(db, 'songs', params.id);
      const snapshot = await getDoc(songRef);
      const data = snapshot.data();

      if (snapshot.exists() && data) {    
        let plain = data.lyrics?.plain || '';
        let synced = data.lyrics?.synced || null;
        let rhymeEncoded = data.lyrics?.rhymeEncoded || lyricsToHtml(plain);

        const track: SavedSong = {
          title: data.title || cleanTrackName(spotifyTrack.name),
          artist: data.artist || artistName,
          spotify: params.id,
          lyrics: { plain, synced, rhymeEncoded },
        };

        setSavedSong(track);
      }
    };

    findOrCreateSong();
  }, [spotifyTrack, params.id, artistName]);

  useEffect(() => {
    if (!lyricsData || savedSong || !spotifyTrack) return;

    const saveNewSong = async () => {
      setIsSaving(true);
      const plain = lyricsData.lyrics.plain?.trim() || '';
      const synced = lyricsData.lyrics.synced?.trim() || null;
      const rhymeEncoded = lyricsToHtml(plain);

      const newSong: SavedSong = {
        title: cleanTrackName(spotifyTrack.name),
        artist: artistName,
        spotify: params.id,
        lyrics: { plain, synced, rhymeEncoded },
      };

      try {
        await setDoc(doc(db, 'songs', params.id), newSong);
        setSavedSong(newSong);
        console.log('New song saved');
      } catch (err) {
        console.error('Failed to save:', err);
      } finally {
        setIsSaving(false);
      }
    };

    saveNewSong();
  }, [lyricsData, savedSong, spotifyTrack, artistName, params.id]);

  const handleLyricsUpdate = async (htmlContent: string) => {
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
      await updateDoc(doc(db, 'songs', params.id), {
        'lyrics.plain': plainTextLyrics,
        'lyrics.rhymeEncoded': htmlContent,
      });
      console.log('Lyrics updated');
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  useEffect(() => {
    if (!spotifyTrack) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const pollPlayback = async () => {
      const data = await spotifyApi(`/me/player`);
       console.log('get player', data);

      if(data) {
          if (data?.item?.id === params.id) {
          setIsPlaying(data.is_playing);
          setCurrentPosition(data.progress_ms / 1000);
        } else {
          setIsPlaying(false);
          setCurrentPosition(0);
        }
      }
    };

    pollPlayback();

    pollIntervalRef.current = setInterval(pollPlayback, 500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [spotifyTrack, params.id]);

  useEffect(() => {
    if (!savedSong?.lyrics.synced || !lyricsContainerRef.current) return;

    const lines = savedSong.lyrics.synced
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && /^\[/.test(l));

    const parsed: SyncedLine[] = lines
      .map(line => {
        const m = line.match(/\[(\d+):(\d+\.\d+|\d+)\](.*)/);
        if (!m) return null;
        const [, mins, secs, txt] = m;
        const time = parseInt(mins) * 60 + parseFloat(secs);
        return { time, text: txt.trim(), element: null };
      })
      .filter(Boolean) as SyncedLine[];

    syncedLinesRef.current = parsed;

    requestAnimationFrame(() => {
      const els = lyricsContainerRef.current?.querySelectorAll('.synced-line');
      els?.forEach((el, i) => {
        if (parsed[i]) parsed[i].element = el as HTMLDivElement;
      });
    });
  }, [savedSong?.lyrics.synced]);

  useEffect(() => {
    if (!syncedLinesRef.current.length || !lyricsContainerRef.current || !isPlaying) return;

    const active = syncedLinesRef.current
      .filter(l => currentPosition >= l.time)
      .pop();

    if (!active?.element) return;

    const container = lyricsContainerRef.current;
    const line = active.element;


    document.querySelectorAll('.synced-line').forEach(el => {
      el.classList.toggle('active', el === line);
    });

    void container.offsetHeight;

    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    const lineCenterY = lineRect.top - containerRect.top + container.scrollTop + lineRect.height / 2;
    const targetScrollTop = lineCenterY - containerHeight / 2;

    const maxScroll = container.scrollHeight - containerHeight;
    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

    if (Math.abs(container.scrollTop - finalScrollTop) > 5) {
      container.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth',
      });
    }
  }, [currentPosition, isPlaying]);

  const displayLyrics = savedSong?.lyrics
    ? {
        ...savedSong.lyrics,
        rhymeEncoded: savedSong.lyrics.rhymeEncoded || lyricsToHtml(savedSong.lyrics.plain),
      }
    : lyricsData?.lyrics
      ? {
          plain: lyricsData.lyrics.plain || '',
          synced: lyricsData.lyrics.synced || null,
          rhymeEncoded: lyricsToHtml(lyricsData.lyrics.plain || ''),
        }
      : null;

  const displayHtml = displayLyrics?.rhymeEncoded || '';
  const hasSynced = !!displayLyrics?.synced;

  if (!spotifyTrack && !fetchError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading song...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-red-500">Error: {fetchError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">

      <div className="flex items-center space-x-6 bg-white rounded-xl shadow-lg p-6">
        <div className="relative w-48 h-48 flex-shrink-0">
          <Image
            src={spotifyTrack.album.images[0]?.url || '/placeholder.png'}
            alt={spotifyTrack.name}
            fill
            className="rounded-lg object-cover"
          />
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{spotifyTrack.name}</h1>
          <p className="text-xl text-gray-600 mt-1">
            {spotifyTrack.artists.map((a: any) => a.name).join(', ')}
          </p>
          <p className="text-sm text-gray-500 mt-2">Album: {spotifyTrack.album.name}</p>
          <p className="text-sm text-gray-500">
            Released: {new Date(spotifyTrack.album.release_date).getFullYear()}
          </p>
          {/* {hasSynced && (
            <p className="text-xs text-green-600 mt-2 font-medium">
              Synced lyrics available
            </p>
          )} */}
        </div>

        <button
          onClick={togglePlayback}
          className="text-green-500 hover:text-green-600 transition"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <FaPauseCircle size={48} /> : <FaPlayCircle size={48} />}
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-black text-2xl font-bold">Lyrics</h2>
          {displayLyrics && !editMode && (
            <button
              onClick={toggleEdit}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FaEdit /> Edit
            </button>
          )}
        </div>

        {isSaving && <p className="text-sm text-gray-500">Saving...</p>}
        {lyricsLoading && !savedSong && <p className="text-gray-600 animate-pulse">Searching lyrics...</p>}
        {lyricsError && !savedSong && (
          <p className="text-red-500">
            {lyricsError.includes('not found') ? 'Lyrics not available.' : `Error: ${lyricsError}`}
          </p>
        )}
        {!lyricsLoading && !displayLyrics && <p className="text-gray-500 italic">No lyrics found.</p>}

        {displayLyrics && !editMode && hasSynced && (
          <div
            ref={lyricsContainerRef}
            className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="p-4 space-y-3 text-lg font-medium">
              {savedSong?.lyrics.synced
                ?.split('\n')
                .map((line, i) => {
                  const m = line.match(/\[(\d+):(\d+\.\d+|\d+)\](.*)/);
                  if (!m) return null;
                  const txt = m[3].trim();
                  return (
                    <div
                      key={i}
                      className="synced-line px-4 py-2 rounded-lg bg-white shadow-sm transition-all duration-300 text-black"
                    >
                      {txt}
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </div>
        )}

        {displayLyrics && !editMode && !hasSynced && (
          <div className="prose prose-lg max-w-none">
            <div
              className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          </div>
        )}

        {/* {hasSynced && (
          <details className="mt-6 border-t pt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
              View synced timestamps
            </summary>
            <pre className="mt-3 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {displayLyrics.synced}
            </pre>
          </details>
        )} */}

        {editMode && (
          <div className="space-y-4">
            <SunEditor
              setContents={displayHtml}
              onChange={handleLyricsUpdate}
              setOptions={{
                height: '500px',
                buttonList: [
                  ['undo', 'redo'],
                  ['fontColor', 'hiliteColor']
                ],
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={toggleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <FaSave /> Save
              </button>
              <button
                onClick={toggleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}