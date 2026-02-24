'use client';
import { useState, useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import { songService, SavedSong } from '@/modules/lyrics';
import { useSpotifyApi } from '@/modules/spotify';
import type { SpotifyTrack } from '@/modules/spotify/types/spotify';
import { FaYoutube } from 'react-icons/fa';

type SongWithId = SavedSong & { id: string };
type SongWithTrack = SongWithId & { track?: SpotifyTrack };

interface EncodedSongsListProps {
  limit?: number;
  showTitle?: boolean;
  title?: string;
  showCompleteTag?: boolean;
  showCount?: boolean;
  randomize?: boolean;
}

export default function EncodedSongsList({ 
  limit,
  showTitle = true,
  title = "All Encoded Songs",
  showCompleteTag = true,
  showCount = true,
  randomize = false
}: EncodedSongsListProps) {
  const [songs, setSongs] = useState<SongWithTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const spotify = useSpotifyApi();

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const completeSongs = await songService.getSongsWithRhymeComplete(limit);
        
        // Fetch Spotify track data for each song to get album images
        const songsWithTracks = await Promise.all(
          completeSongs.map(async (song) => {
            try {
              const track = await spotify.getTrack(song.id);
              return { ...song, track };
            } catch (err) {
              console.error(`Failed to fetch track ${song.id}:`, err);
              return song;
            }
          })
        );
        
        // Randomize if needed
        const finalSongs = randomize 
          ? songsWithTracks.sort(() => Math.random() - 0.5)
          : songsWithTracks;
        
        setSongs(finalSongs);
      } catch (err) {
        console.error('Failed to fetch songs:', err);
        setError('Failed to load songs');
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [limit, spotify, randomize]);

  const handleYoutubeIconClick = (event: MouseEvent<HTMLSpanElement>, url: string | null | undefined) => {
    event.preventDefault();
    event.stopPropagation();

    if (!url) return;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  };

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
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          {showCount && (
            <p className="text-gray-400 text-sm">
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
            className="block p-3 md:p-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-200 border border-gray-800 hover:border-teal-600"
          >
            <div className="flex items-center gap-3 md:gap-4">
              {/* Album Image */}
              {song.track?.album?.images?.[0] && (
                <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 relative">
                  <Image
                    src={song.track.album.images[0].url}
                    alt={song.title || 'Album artwork'}
                    fill
                    className="object-cover rounded-md"
                    sizes="80px"
                  />
                </div>
              )}
              
              {/* Song Info */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-white truncate">
                    {song.title || 'Untitled'}
                  </h3>
                  <p className="text-gray-400 text-xs md:text-sm truncate">
                    {song.artists && song.artists.length > 0 ? (
                      song.artists.map((artist, index) => (
                        <span key={artist?.id || index}>
                          {artist?.name || 'Unknown Artist'}
                          {song.artists && index < song.artists.length - 1 && ', '}
                        </span>
                      ))
                    ) : (
                      song.artist || 'Unknown Artist'
                    )}
                  </p>
                  {song.track?.album?.name && (
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {song.track.album.name}
                    </p>
                  )}
                </div>
                
                <div className="flex-shrink-0 flex items-center gap-2">
                  {typeof song.youtubeUrl === 'string' && song.youtubeUrl.trim() !== '' && (
                    <span
                      className="inline-flex items-center text-red-500 cursor-pointer"
                      title="YouTube URL available"
                      aria-label="YouTube URL available"
                      onClick={(event) => handleYoutubeIconClick(event, song.youtubeUrl)}
                    >
                      <FaYoutube size={24} />
                    </span>
                  )}
                  {showCompleteTag && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-teal-600 text-white">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
