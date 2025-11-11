'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

import { spotifyApi } from '@/hooks/spotify';
import { useLyrics } from '@/hooks/useLyrics';

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase-config';
import { htmlToLyrics, lyricsToHtml } from '@/utils/lyrics'; 

import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { FaEdit, FaPlayCircle, FaSave, FaTimes } from 'react-icons/fa';

interface SavedSong {
  title: string;
  artist: string;
  spotify: string;
  lyrics: {
    plain: string,
    colorCoded: string
  };
}

export default function Song({ params }: { params: { id: string } }) {
  const [spotifyTrack, setSpotifyTrack] = useState<any>(null);
  const [savedSong, setSavedSong] = useState<SavedSong | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cleanTrackName = (name: string) => name.replace(/&/g, 'and').split('(')[0].trim();
  const artistName = spotifyTrack?.artists?.[0]?.name || '';
  const trackName = spotifyTrack?.name || '';

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError, refetch } = useLyrics(
    artistName,
    cleanTrackName(trackName)
  );

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
      const data = snapshot.data() as SavedSong | undefined;

      if (snapshot.exists() && data) {
        const lyricsObj =
          typeof data.lyrics === 'string'
            ? { plain: data.lyrics, colorCoded: lyricsToHtml(data.lyrics) }
            : data.lyrics;

        const migrated: SavedSong = {
          title: data.title,
          artist: data.artist,
          spotify: data.spotify,
          lyrics: lyricsObj,
        };
        console.log('Song found in DB:', migrated);
        setSavedSong(migrated);
      }
    };

    findOrCreateSong();
  }, [spotifyTrack, params.id]);

  useEffect(() => {
    if (!lyricsData || savedSong || !spotifyTrack) return;

    const saveNewSong = async () => {
      setIsSaving(true);
      const plain = lyricsData.lyrics;
      const newSong: SavedSong = {
        title: cleanTrackName(spotifyTrack.name),
        artist: artistName,
        spotify: params.id,
        lyrics: {
          plain,
          colorCoded: lyricsToHtml(plain),
        },
      };

      try {
        await setDoc(doc(db, 'songs', params.id), newSong);
        setSavedSong(newSong);
        console.log('New song saved with proper \\n');
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
          plain: plainTextLyrics,
          colorCoded: htmlContent,
        },
      };
    setSavedSong(updated);

    try {
      await updateDoc(doc(db, 'songs', params.id), {
        'lyrics.plain': plainTextLyrics,
        'lyrics.colorCoded': htmlContent,
      });
      console.log('Lyrics saved');
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const toggleEdit = () => setEditMode(prev => !prev);

  const playSong = async () => {
    console.log('Play song:', params.id);
 
  };

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

  const displayLyrics = savedSong?.lyrics || {
    plain: lyricsData?.lyrics || '',
    colorCoded: lyricsToHtml(lyricsData?.lyrics || ''),
  };

  const displayPlain = displayLyrics.plain;
  const displayHtml  = displayLyrics.colorCoded;

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
        </div>

        <button onClick={playSong} className="text-green-500 hover:text-green-600 transition" title="Play on Spotify">
          <FaPlayCircle size={48} />
        </button>
      </div>


      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-black text-2xl font-bold">Lyrics</h2>
          {displayLyrics && !editMode && (
            <button onClick={toggleEdit} className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
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
        
        {displayLyrics && !editMode && (
          <div
            className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        )}
        

        {editMode && (
          <div className="space-y-4">
          <SunEditor
                setContents={displayHtml}
                onChange={handleLyricsUpdate}
                setOptions={{
                  height: '500px',
                  buttonList: [
                    ['undo', 'redo'],
                    ['fontColor', 'hiliteColor'],
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