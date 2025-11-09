'use client'
import { useState, useEffect } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import Track from '@/components/track'
import { spotifyApi, getRefreshToken } from '@/hooks/spotify';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState();

  useEffect(() => {
    currentlyPlaying();
  },[])


  const currentlyPlaying = async function () {
    const current = await spotifyApi('/me/player/currently-playing');
    if(current) {
      setCurrentTrack(current.item);
    } else {
      const auth = JSON.parse(localStorage.getItem('auth') || '');

      if (auth.refresh_token) {
        const refresh = await getRefreshToken(auth.refresh_token);

        console.log('get refresh token', refresh);

        localStorage.setItem('access_token', refresh.access_token);
      } 
    }
  }

  return (
      <div className='flex justify-center'>
        {currentTrack && (
          <Track active={currentTrack}/>
        )}
      </div>
  )
}
