'use client'
import { use, useState, useEffect, Key } from 'react';
import Link from 'next/link'

import { useSpotifyApi } from '@/modules/spotify';

export default function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState <any>();
  const spotify = useSpotifyApi();

  useEffect(() => {
    const getAlbum = async function () {
      const album = await spotify.getAlbum(id);
    
      if(album?.tracks) {
        console.log('album tracks', album);
        setAlbum(album.tracks.items);
      }
    }
    getAlbum();
  },[id, spotify])

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

