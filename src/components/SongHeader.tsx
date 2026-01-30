'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link'
import Image from 'next/image';
import { FaPlayCircle, FaPauseCircle } from 'react-icons/fa';
import { SpotifyTrack } from '@/modules/spotify';

export default function SongHeader({ 
    track, 
    isPlaying,
    togglePlayback,
    rhymeColorMappingComplete,
    isAdmin = false,
    showPlaybackControl = true,
    showTitle = false,
    title = "Now Playing"
}: { 
    track: SpotifyTrack; 
    isPlaying: boolean,
    togglePlayback?: () => void;
    rhymeColorMappingComplete?: boolean;
    isAdmin?: boolean;
    showPlaybackControl?: boolean;
    showTitle?: boolean;
    title?: string;
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
    <div className="space-y-4">
      {showTitle && (
        <h1 className="text-sm md:text-3xl md:text-3xl font-bold text-white">{title}</h1>
      )}
      <div className="flex md:flex-row items-center space-x-6">
        <div className='relative order-1 md:order-1'>
          <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0">
            <Image
              src={track.album.images[0]?.url || '/placeholder.png'}
              alt={track.name}
              fill
              className="rounded-lg object-cover"
            />
          </div>
          {showPlaybackControl && togglePlayback && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleToggle}
                aria-label={optimisticIsPlaying ? 'Pause' : 'Play'}
                className="text-green-500 hover:text-green-600 transition bg-white bg-opacity-100 rounded-full cursor-pointer"
              >
                {optimisticIsPlaying ? <FaPauseCircle size={48} /> : <FaPlayCircle size={48} />}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 order-1 md:order-2 mb-4 md:mb-0 text-wrap text-left">
          <Link className="link" href={`/songs/${track.id}`}>
            <h1 className="text-lg md:text-3xl font-bold text-white">{track.name}</h1>
          </Link>
          
          <p className="text-base md:text-xl text-white mt-1">
            {track.artists.map((a) => a.name).join(', ')}
          </p>
          <p className="text-sm text-white mt-2">Album: {track.album.name}</p>
          <p className="text-sm text-white">
            Released: {new Date(track.album.release_date).getFullYear()}
          </p>
          {rhymeColorMappingComplete && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-teal-600 text-white">
                ✓ Rhyme Mapping Complete
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
