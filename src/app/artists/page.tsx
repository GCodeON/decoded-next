'use client'
import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

import { useSpotifyApi, SpotifyArtist } from '@/modules/spotify';
import { useUser } from '@/modules/auth';

export default function Artists() {
  const [artists, setArtists] = useState<SpotifyArtist[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<'popular' | 'user' | null>(null);
  const spotify = useSpotifyApi();
  const { user, authenticated, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    const fetchPopularArtists = async () => {
      if (source !== 'popular') {
        setArtists(null);
        setIsLoading(true);
      }
      try {
        const response = await fetch('/api/artists/popular');
        if (response.ok) {
          const data = await response.json();
          setArtists(data.artists);
          setSource('popular');
        }
      } catch (error) {
        console.error('Failed to fetch popular artists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserArtists = async () => {
      if (source !== 'user') {
        setArtists(null);
        setIsLoading(true);
      }
      try {
        const data = await spotify.getTopArtists(20);
        if (data?.items) {
          setArtists(data.items);
          setSource('user');
        }
      } catch (error) {
        console.error('Failed to fetch user top artists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (authenticated) {
      fetchUserArtists();
    } else {
      fetchPopularArtists();
    }
  }, [authenticated, loading, source, spotify]);

  return (
    <div className="flex justify-center py-8">
      {isLoading ? (
        <LoadingSpinner message="Loading artists..." fullHeight />
      ) : artists ? (
        <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-4 p-2 sm:p-6'>
          {artists && (
            artists.map((artist, index) => {
              const imageUrl = artist.images[0]?.url || '/placeholder-artist.jpg';
              return (
                <Link  href={`/artists/${artist.id}`}
                  key={artist.id}
                  className="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-102 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  prefetch={false}>
                  <div className="artist bg-center bg-cover h-80 w-56 md:w-80 lg:w-80" 
                  style={{backgroundImage:`url(${imageUrl})`}}
                  key={index}>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 transition-opacity duration-300 rounded-b-2xl">
                    <h3 className="text-white font-bold text-lg truncate">
                      {artist.name}
                    </h3>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
};
  
