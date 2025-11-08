'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { spotifyApi } from '@/hooks/spotify';
import { useLyrics } from '@/hooks/useLyrics';

export default function Song({ params }: { params: { id: string } }) {
  const [song, setSong] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { data: lyricsData, loading: lyricsLoading, error: lyricsError } = useLyrics(
    song?.artists?.[0]?.name || '', song?.name || ''
  );

  console.log('lyrics data', lyricsData);

  useEffect(() => {
    const getSong = async () => {
      try {
        setFetchError(null);
        const data = await spotifyApi(`/tracks/${params.id}`);
        setSong(data);
      } catch (err: any) {
        console.error('Failed to fetch song:', err);
        setFetchError(err.message || 'Failed to load song');
      }
    };

    getSong();
  }, [params.id]);

  if (!song && !fetchError) {
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
            src={song.album.images[0]?.url || '/placeholder.png'}
            alt={song.name}
            fill
            className="rounded-lg object-cover"
          />
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{song.name}</h1>
          <p className="text-xl text-gray-600 mt-1">
            {song.artists.map((a: any) => a.name).join(', ')}
          </p>
          <p className="text-sm text-gray-500 mt-2">Album: {song.album.name}</p>
          <p className="text-sm text-gray-500">Released: {new Date(song.album.release_date).getFullYear()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Lyrics</h2>

        {lyricsLoading && (
          <p className="text-gray-600 animate-pulse">Searching lyrics...</p>
        )}

        {lyricsError && (
          <p className="text-red-500">
            {lyricsError.includes('not found')
              ? 'Lyrics not available for this song.'
              : `Error: ${lyricsError}`}
          </p>
        )}

        {lyricsData && (
          <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
            {lyricsData.lyrics}
          </pre>
        )}

        {!lyricsLoading && !lyricsError && !lyricsData && (
          <p className="text-gray-500 italic">No lyrics found.</p>
        )}
      </div>
    </div>
  );
}