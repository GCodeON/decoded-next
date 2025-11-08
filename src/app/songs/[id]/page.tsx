
'use client'
import { useState, useEffect, Key } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import { spotifyApi } from '@/hooks/spotify';

export default function Song({ params }: { params: { id: string } }) {
  const [song, setSong] = useState();

  useEffect(() => {
    getSong();
  },[])

  const getSong = async function () {
    const song = await spotifyApi(`/tracks/${params.id}`);
    if(song) {
      console.log('get song', song);
    }
  }

  return (
    <div className=''>
      {song && (
       <p></p>
      )}
    </div>
  )
}

