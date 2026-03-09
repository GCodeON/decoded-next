'use client';
import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const [itemsToShow, setItemsToShow] = useState(itemsPerPage.mobile || 1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const spotify = useSpotifyApi();

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });

  // Handle responsive items per page
  useEffect(() => {
    const updateItemsToShow = () => {
      const width = window.innerWidth;
      if (width >= 1440) {
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

  // Embla callbacks
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Group songs by itemsToShow
  const groupedSongs: SongWithTrack[][] = [];
  for (let i = 0; i < songs.length; i += itemsToShow) {
    groupedSongs.push(songs.slice(i, i + itemsToShow));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[500px] text-red-500">
        {error}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[500px] text-gray-400">
        No songs found
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-4 md:p-6 space-y-4">
        {showTitle && (
        <div className="mb-6">
            <h1 className="text-smmd:text-3xl font-bold text-white mb-2">{title}</h1>
            {showCount && (
            <p className="text-gray-400">
                {songs.length} {songs.length === 1 ? 'song' : 'songs'} found
            </p>
            )}
        </div>
        )}

        {/* Embla Carousel */}
        <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                        {groupedSongs.map((group, pageIndex) => (
                            <div 
                                key={pageIndex} 
                                className="flex-[0_0_100%] min-w-0"
                            >
                                <div className={`grid gap-4 ${
                                itemsToShow === 1 ? 'grid-cols-1' : 
                                itemsToShow === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                }`}>
                                    {group.map((song) => (
                                        <div
                                        key={song.id}
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => router.push(`/songs/${song.id}`)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            router.push(`/songs/${song.id}`);
                                          }
                                        }}
                                        className="block p-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-200 border border-gray-800 hover:border-teal-600 hover:scale-[1.02] cursor-pointer"
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
                              </div>
                        ))}
                    </div>
                </div>
                ))}
            </div>
            </div>

            {/* Navigation Arrows */}
            {groupedSongs.length > 1 && (
            <>
                <button
                onClick={scrollPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors z-10 cursor-pointer"
                aria-label="Previous slide"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                </button>
                <button
                onClick={scrollNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors z-10 cursor-pointer"
                aria-label="Next slide"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                </button>
            </>
            )}
        </div>

        {/* Dots Indicator */}
        {groupedSongs.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: groupedSongs.length }).map((_, index) => (
            <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                index === selectedIndex ? 'bg-teal-500' : 'bg-gray-600'
                }`}
                aria-label={`Go to slide ${index + 1}`}
            />
            ))}
        </div>
        )}
    </div>
  );
}
