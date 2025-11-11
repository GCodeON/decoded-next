'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { db } from '@/utils/firebase-config';

import { spotifyApi } from '@/hooks/spotify';
import { useLyrics } from '@/hooks/useLyrics';



export default function Song({ params }: { params: { id: string } }) {
  const [spotifyTrack, setSpotifyTrack] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log('get pararms id', params.id);
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
    console.log('spotify track', spotifyTrack);
    findorCreate(params.id);
  }, [spotifyTrack]);

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useLyrics(
    spotifyTrack?.artists?.[0]?.name || '', spotifyTrack?.name || ''
  );

  console.log('lyrics data', lyricsData);

  async function findorCreate(id: string) {
    console.log('find or create', db)
    const findSong = doc(db, "songs", id);

    const song = await getDoc(findSong)

    const savedData = song.data();

    if(song.exists()) {
        console.log('song exists in custom db', savedData);
    } else {
      console.log('song does not exist in custom db');
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">
            {spotifyTrack.name}
            </h1>
          <p className="text-xl text-gray-600 mt-1">
            {spotifyTrack.artists.map((a: any) => a.name).join(', ')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Album: {spotifyTrack.album.name}
          </p>
          <p className="text-sm text-gray-500">
            Released: {new Date(spotifyTrack.album.release_date).getFullYear()}
          </p>
        </div>
      </div>

      <div className=" rounded-xl shadow-lg p-6">
        {lyricsLoading && (
          <p className="text-gray-600 animate-pulse">
            Searching lyrics...
          </p>
        )}

        {lyricsError && (
          <p className="text-red-500">
            {lyricsError.includes('not found')
              ? 'Lyrics not available for this song.'
              : `Error: ${lyricsError}`}
          </p>
        )}

        {lyricsData && (
          <pre className="whitespace-pre-wrap font-sans text-white-700 leading-relaxed text-2xl font-semibold">
            {lyricsData.lyrics}
          </pre>
        )}

        {!lyricsLoading && !lyricsError && !lyricsData && (
          <p className="text-gray-500 italic">
            No lyrics found.
          </p>
        )}
      </div>
    </div>
  );
}