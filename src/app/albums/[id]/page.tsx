
'use client'
import { useState, useEffect, Key } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import { useSpotifyApi } from '@/hooks/spotify/useSpotifyApi';

export default function Album({ params }: { params: { id: string } }) {
  const [album, setAlbum] = useState <any>();
  const { spotifyApi } = useSpotifyApi();

  useEffect(() => {
    const getAlbum = async function () {
      const album = await spotifyApi(`/albums/${params.id}`);
    
      if(album) {
        console.log('album tracks', album);
        setAlbum(album.tracks.items);
      }
    }
    getAlbum();
  },[])

  return (
    <div className='flex flex-col gap-1 justify-center'>
      {album && (
        album.map((track: any, index: Key) => {
          return (
            <Link className="link cursor-pointer" href={`/songs/${track.id}`} key={index}>
              <div className="" 
              key={index}>
                <h3 className='p-2'>
                  {track.name}
                </h3>
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}

