'use client'
import { useState, useEffect } from 'react';

import Image from 'next/image'
import Link from 'next/link'

export default function Track({active}: {active: any}) {
  const [track, setTrack]  = useState<any>();

  useEffect(() => {
    if(active) {
      setTrack(active)
    }
  }, []);


  return (
    <div className="track-info">
      { track &&  (
        <div className="current flex flex-col text-center">
          <h3>Currently Playing</h3>
          <Link className="link" href={`/songs/${track.id}`}>
            <Image className="track-image" 
              src={track.album.images[1].url} 
              alt={track.name}
              width={track.album.images[1].width}
              height={track.album.images[1].height}
              
            />
            <h1 className="track-name">
              { track.name }
            </h1>
          </Link>
          <Link className="link" href={`/artists/${track.artists[0].id}`}>
            <h1 className="track-name">
              { track.artists[0].name }
            </h1>
          </Link>
        </div>
      )}
    </ div>
  );
}