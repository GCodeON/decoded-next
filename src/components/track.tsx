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
        // <div className="current flex flex-col text-center">
        //   <h3>Currently Playing</h3>
        //   <Link className="link" href={`/songs/${track.id}`}>
        //     <Image className="track-image" 
        //       src={track.album.images[1].url} 
        //       alt={track.name}
        //       width={track.album.images[1].width}
        //       height={track.album.images[1].height}
              
        //     />
        //     <h1 className="track-name">
        //       { track.name }
        //     </h1>
        //   </Link>
        //   <Link className="link" href={`/artists/${track.artists[0].id}`}>
        //     <h1 className="track-name">
        //       { track.artists[0].name }
        //     </h1>
        //   </Link>
        // </div>
        <div className="flex items-center space-x-6 bg-white rounded-xl shadow-lg p-6 ">
          <div className="relative w-48 h-48 flex-shrink-0">
            <Image
              src={track.album.images[0]?.url || '/placeholder.png'}
              alt={track.name}
              fill
              className="rounded-lg object-cover"
            />
          </div>
  
          <div className="flex-1">
            <Link className="link" href={`/songs/${track.id}`}>
              <h1 className="text-3xl font-bold text-gray-900">{track.name}</h1>
            </Link>
            <p className="text-xl text-gray-600 mt-1">
              {track.artists.map((a: any) => a.name).join(', ')}
            </p>
            <p className="text-sm text-gray-500 mt-2">Album: {track.album.name}</p>
            <p className="text-sm text-gray-500">Released: {new Date(track.album.release_date).getFullYear()}</p>
          </div>
        </div>
      )}
    </ div>
  );
}