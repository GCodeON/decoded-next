'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import { songService, SavedSong } from '@/modules/lyrics';
import { useSpotifyApi } from '@/modules/spotify';
import type { SpotifyTrack } from '@/modules/spotify/types/spotify';

type SongWithId = SavedSong & { id: string };
type SongWithTrack = SongWithId & { track?: SpotifyTrack };

interface LatestEncodedProps {
  limit?: number;
  showCount?: boolean;
  showTitle?: boolean;
  title?: string;
  showCompleteTag?: boolean;
  itemsPerPage?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  randomize?: boolean;
}

export default function LatestEncoded({ 
  limit = 15, 
  showCount = true,
  showTitle = true,
  title = "Latest Encoded Songs",
  showCompleteTag = true,
  itemsPerPage = { mobile: 1, tablet: 2, desktop: 3 },
  randomize = false
}: LatestEncodedProps) {
  const [songs, setSongs] = useState<SongWithTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(itemsPerPage.mobile || 1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const spotify = useSpotifyApi();

  // Handle responsive items per page
  useEffect(() => {
    const updateItemsToShow = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setItemsToShow(itemsPerPage.desktop || 3);
      } else if (width >= 768) {
        setItemsToShow(itemsPerPage.tablet || 2);
      } else {
        setItemsToShow(itemsPerPage.mobile || 1);
      }
    };

    updateItemsToShow();
    window.addEventListener('resize', updateItemsToShow);
    return () => window.removeEventListener('resize', updateItemsToShow);
  }, [itemsPerPage]);

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

  const goToNext = () => {
    if (isAnimating) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setCurrentIndex((prev) => {
      const maxIndex = Math.ceil(songs.length / itemsToShow) - 1;
      return prev >= maxIndex ? 0 : prev + 1;
    });
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToPrevious = () => {
    if (isAnimating) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setCurrentIndex((prev) => {
      const maxIndex = Math.ceil(songs.length / itemsToShow) - 1;
      return prev <= 0 ? maxIndex : prev - 1;
    });
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setSlideDirection(index > currentIndex ? 'right' : 'left');
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const totalPages = Math.ceil(songs.length / itemsToShow);
  const startIndex = currentIndex * itemsToShow;
  const visibleSongs = songs.slice(startIndex, startIndex + itemsToShow);

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

      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <div 
          className={`grid gap-4 transition-all duration-500 ease-in-out ${
            isAnimating 
              ? slideDirection === 'right' 
                ? 'translate-x-[-10px] opacity-90' 
                : 'translate-x-[10px] opacity-90'
              : 'translate-x-0 opacity-100'
          } ${
            itemsToShow === 1 ? 'grid-cols-1' : 
            itemsToShow === 2 ? 'grid-cols-1 md:grid-cols-2' : 
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {visibleSongs.map((song) => (
            <Link
              key={song.id}
              href={`/songs/${song.id}`}
              className="block p-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-200 border border-gray-800 hover:border-teal-600 hover:scale-[1.02]"
            >
              <div className="flex flex-col items-start gap-4">
                {/* Album Image */}
                {song.track?.album?.images?.[0] && (
                  <div className="w-full h-48 flex-shrink-0 relative">
                    <Image
                      src={song.track.album.images[0].url}
                      alt={song.title || 'Album artwork'}
                      fill
                      className="object-cover rounded-lg"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                
                {/* Song Info */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white break-words flex-1">
                      {song.title || 'Untitled'}
                    </h3>
                    {showCompleteTag && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-teal-600 text-white flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
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
                  {song.track?.album?.name && (
                    <p className="text-gray-500 text-xs mt-1">
                      {song.track.album.name}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalPages > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors z-10 cursor-pointer"
              aria-label="Previous song"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors z-10 cursor-pointer"
              aria-label="Next song"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-teal-500' : 'bg-gray-600'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
