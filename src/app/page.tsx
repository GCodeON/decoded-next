'use client'
import { useState, useEffect } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import Track from '@/components/track'
import { spotifyApi } from '@/hooks/spotify';

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState();
  const [token, setToken] = useState('');

  useEffect(() => {
    const access_token = localStorage.getItem('access_token')
    if(access_token) {
      setToken(access_token)
    }
  },[])

  useEffect(() => {
    if(token) {
      currentlyPlaying();
    }
  },[token])


  const currentlyPlaying = async function () {
    const current = await spotifyApi('/me/player/currently-playing', token)
    if(current) {
      setCurrentTrack(current.item);
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
