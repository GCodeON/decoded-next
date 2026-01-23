'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link'
import Image from 'next/image';
import { FaPlayCircle, FaPauseCircle } from 'react-icons/fa';
import { SpotifyTrack } from '@/modules/spotify';

export default function SongHeader({ 
    track, 
    isPlaying,
    togglePlayback
}: { 
    track: SpotifyTrack; 
    isPlaying: boolean,
    togglePlayback?: () => void;
}) {
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState(isPlaying);

  useEffect(() => {
    setOptimisticIsPlaying(isPlaying);
  }, [isPlaying]);

  const handleToggle = async () => {
    setOptimisticIsPlaying(!optimisticIsPlaying);
    if (togglePlayback) {
      await togglePlayback();
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center space-x-6 bg-white rounded-xl shadow-lg p-6">
      <div className='relative order-2 md:order-1'>
        <div className="relative w-48 h-48 flex-shrink-0">
          <Image
            src={track.album.images[0]?.url || '/placeholder.png'}
            alt={track.name}
            fill
            className="rounded-lg object-cover"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handleToggle}
            aria-label={optimisticIsPlaying ? 'Pause' : 'Play'}
            className="text-green-500 hover:text-green-600 transition bg-white bg-opacity-100 rounded-full cursor-pointer"
          >
            {optimisticIsPlaying ? <FaPauseCircle size={48} /> : <FaPlayCircle size={48} />}
          </button>
        </div>
      </div>

      <div className="flex-1 order-1 md:order-2 mb-4 md:mb-0 text-wrap text-center md:text-left">
        <Link className="link" href={`/songs/${track.id}`}>
          <h1 className="text-3xl font-bold text-gray-900">{track.name}</h1>
        </Link>
        
        <p className="text-xl text-gray-600 mt-1">
          {track.artists.map((a) => a.name).join(', ')}
        </p>
        <p className="text-sm text-gray-500 mt-2">Album: {track.album.name}</p>
        <p className="text-sm text-gray-500">
          Released: {new Date(track.album.release_date).getFullYear()}
        </p>
      </div>
    </div>
  );
}
