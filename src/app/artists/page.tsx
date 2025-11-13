'use client'
import { useState, useEffect, Key } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import { useSpotifyApi } from '@/hooks/useSpotifyApi';

export default function Artists() {
  const [artists, setArtists] = useState<any>();
  const { spotifyApi } = useSpotifyApi();

  useEffect(() => {
    getTopArtists();
  },[])


  const getTopArtists = async function () {
    const data = await spotifyApi('/me/top/artists');
    
    if(data) {
      console.log('artist data', data);
      setArtists(data.items);
    }
  }

  return (
    <div className="flex justify-center py-8">
      {artists ? (
       <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4'>
          {artists && (
            artists.map((artist: any, index: Key) => {
              return (
                <Link className="link cursor-pointer" href={`/artists/${artist.id}`} key={index}>
                  <div className="artist bg-center bg-cover h-80 w-56 md:w-60 lg:w-80" 
                  style={{backgroundImage:`url(${artist.images[0].url})`}}
                  key={index}>
                    <h3 className='p-2'>
                      {artist.name}
                    </h3>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Unable to load Artists</p>
      )}
    </div>
  )
};



  
