
'use client'
import { useState, useEffect, Key } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import { useSpotifyApi, SpotifyArtist, SpotifyAlbum } from '@/features/spotify/';

export default function Artist({ params }: { params: { id: string } }) {
  const [artist, setArtist] = useState<SpotifyArtist[] | null>(null);
  const [albums, setAlbums] = useState<SpotifyAlbum[] | null>(null);
  const { spotifyApi } = useSpotifyApi();

  useEffect(() => {
    const getArtist = async() => {
      try {
        const data = await spotifyApi(`/artists/${params.id}`)
        if(data) {
          console.log('artist data', data);
          setArtist(data);
        }
      } catch (error) {
        console.error('Failed to fetch artists:', error);
      }
    }

    getArtist();
  },[params.id, spotifyApi])

  useEffect(() => {
    const getAlbums = async() => {
      try {
        const albums = await spotifyApi(`/artists/${params.id}/albums`)
        if(albums) {
          console.log('album data', albums);
          setAlbums(albums.items);
        }
      } catch (error) {
        console.error('Failed to fetch artists:', error);
      }
    }

    getAlbums();
  }, [params.id, spotifyApi, artist]);

  return (
    <div className="flex justify-center py-8">
      {albums ? (
       <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-4 p-2 sm:p-6'>
          {albums && (
            albums.map((item, index) => {
              const imageUrl =  item.images[0]?.url || '/placeholder-artist.jpg';
              return (
                <Link  href={`/albums/${item.id}`}
                  key={index}
                  className="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-102 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  prefetch={false}>
                  <div className="artist bg-center bg-cover h-80 w-56 md:w-80 lg:w-80" 
                  style={{backgroundImage:`url(${imageUrl})`}}
                  key={index}>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 transition-opacity duration-300 rounded-b-2xl">
                    <h3 className="text-white font-bold text-lg truncate">
                      {item.name}
                    </h3>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Loading ...</p>
      )}
    </div>
  )
}