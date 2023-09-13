
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

  // useEffect(() => {
  //   console.log('albums', albums)
  //   setCenter();
  // }, [albums]);


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
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4'>
        <div>Artist: {params.id}</div>
        {artist && (
          <h1>{ artist.name }</h1>
        )}
    </div>
  )
}

