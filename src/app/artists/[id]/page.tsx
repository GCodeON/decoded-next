
'use client'
import { useState, useEffect, Key } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import { spotifyApi } from '@/hooks/spotify';

export default function Artist({ params }: { params: { id: string } }) {
    const [token, setToken] = useState('');
    const [artist, setArtist] = useState<any>();
    const [albums, setAlbums] = useState <any>();

  useEffect(() => {
    const access_token = localStorage.getItem('access_token')
    if(access_token) {
      setToken(access_token)
    }
  },[])

  useEffect(() => {
    if(token) {
      getArtist();
    }
  },[token])



  useEffect(() => {
    if(artist) {
      getAlbums();
    }
  }, [artist]);

  const getArtist = async function () {
    const data = await spotifyApi(`/artists/${params.id}`, token)
    if(data) {
      console.log('artist data', data);
      setArtist(data.items);
      getAlbums();
    }
  }

  const getAlbums = async function () {
    const albums = await spotifyApi(`/artists/${params.id}/albums`, token)
    if(albums) {
      console.log('album data', albums);
      setAlbums(albums.items);
    }
  }


  return (
    <div className='flex flex-row flex-wrap gap-2 justify-center'>
      {albums && (
        albums.map((album: any, index: Key) => {
          return (
            <Link className="link cursor-pointer" href={`/albums/${album.id}`} key={index}>
              <div className="album bg-center bg-cover h-80 w-56 md:w-60 lg:w-80" 
              style={{backgroundImage:`url(${album.images[0].url})`}}
              key={index}>
                <h3 className='p-2'>
                  {album.name}
                </h3>
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}

