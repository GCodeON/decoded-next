
'use client'
import { useState, useEffect, Key } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import { spotifyApi } from '@/hooks/spotify';

export default function Album({ params }: { params: { id: string } }) {
    const [token, setToken] = useState('');
    const [album, setAlbum] = useState <any>();

  useEffect(() => {
    const access_token = localStorage.getItem('access_token')
    if(access_token) {
      setToken(access_token)
    }
  },[])

  useEffect(() => {
    if(token) {
      getAlbum();
    }
  },[token])

  const getAlbum = async function () {
    const album = await spotifyApi(`/albums/${params.id}`, token)
    if(album) {
      console.log('album tracks', album);
      setAlbum(album.tracks.items);
    }
  }

  return (
    <div className='flex flex-col gap-1 justify-center'>
      {album && (
        album.map((track: any, index: Key) => {
          return (
            <Link className="link cursor-pointer" href={`/song/${track.id}`} key={index}>
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

