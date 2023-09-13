'use client'
import { useState, useEffect } from 'react';
import Image from 'next/image'
import Link from 'next/link'

import Track from '@/components/track'
import { spotifyApi } from '@/hooks/spotify';

export default function Home() {
  const [track, setTrack] = useState();
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
    const res = await spotifyApi('me/player/currently-playing', token)
    console.log('res', res);
    if(res) {
      setTrack(res.item);
    }
  }

  return (
      <div className=''>
        <Track />
      </div>
  )
}
