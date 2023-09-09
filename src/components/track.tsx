'use client'
import { useState, useEffect } from 'react';

import Image from 'next/image'
import Link from 'next/link'

export default function Track() {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<any>();
  const [currentlyPlayingArtist, setCurrentlyPlayingArtist] = useState<any>();
  const [activeTrack, setActiveTrack]  = useState<any>();

  useEffect(() => {
    let track = localStorage.getItem('active');
    if(track){
      let trackInfo = JSON.parse(track);
      setActiveTrack(trackInfo);
    }
  }, []);

  useEffect(() => {
    if(activeTrack) {
      setCurrentlyPlaying(activeTrack);
    }
  }, [activeTrack]);

  useEffect(() => {
    if(currentlyPlaying) {
      let artists = currentlyPlaying.artists[0];
      setCurrentlyPlayingArtist(artists)
    }
  }, [currentlyPlaying]);


  return (
    <div className="track-info">
      { currentlyPlayingArtist &&  (
        <div className="current flex flex-col text-center">
          <h3>Currently Playing</h3>
          <Link className="link" href={`/song/${currentlyPlaying.id}`}>
              <Image className="track-image" 
                src={currentlyPlaying.image} 
                alt={currentlyPlaying.name}
                width={150}
                height={150}
                
              />
              <h1 className="track-name">
                { currentlyPlaying.name }
              </h1>
          </Link>
          <Link className="link" href={`/artist/${currentlyPlayingArtist.id}`}>
            <h1 className="track-name">
                { currentlyPlayingArtist.name }
            </h1>
          </Link>
        </div>
      )}
    </ div>
  );
}