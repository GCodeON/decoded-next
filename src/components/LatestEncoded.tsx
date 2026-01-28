'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { songService, SavedSong } from '@/modules/lyrics';

type SongWithId = SavedSong & { id: string };

interface LatestEncodedProps {
  limit?: number;
  showCount?: boolean;
  showTitle?: boolean;
  title?: string;
}

export default function LatestEncoded({ 
  limit = 15, 
  showCount = true,
  showTitle = true,
  title = "Latest Encoded Songs"
}: LatestEncodedProps) {
  const [songs, setSongs] = useState<SongWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const completeSongs = await songService.getSongsWithRhymeComplete(limit);
        setSongs(completeSongs);
      } catch (err) {
        console.error('Failed to fetch songs:', err);
        setError('Failed to load songs');
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [limit]);

  if (loading) {
    return <LoadingSpinner message="Loading songs..." fullHeight />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-gray-400 text-lg">No songs with complete rhyme mapping found.</p>
        <p className="text-gray-500 text-sm">Mark songs as complete from the song detail page.</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-4 md:p-6 space-y-4">
      {showTitle && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {showCount && (
            <p className="text-gray-400">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'} found
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/songs/${song.id}`}
            className="block p-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors border border-gray-800 hover:border-teal-600"
          >
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">
                  {song.title || 'Untitled'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {song.artists && song.artists.length > 0 ? (
                    song.artists.map((artist, index) => (
                      <span key={artist?.id || index}>
                        {artist?.id ? (
                          <Link
                            href={`/artists/${artist.id}`}
                            className="hover:text-teal-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {artist.name}
                          </Link>
                        ) : (
                          <span>{artist?.name || 'Unknown Artist'}</span>
                        )}
                        {song.artists && index < song.artists.length - 1 && ', '}
                      </span>
                    ))
                  ) : (
                    song.artist || 'Unknown Artist'
                  )}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-teal-600 text-white">
                  ✓ Rhyme Encoding Complete
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
