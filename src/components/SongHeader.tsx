'use client';
import { useState } from 'react';
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
    togglePlayback: () => void;
}) {
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState(isPlaying);

  if (optimisticIsPlaying !== isPlaying) {
    setOptimisticIsPlaying(isPlaying);
  }

  const handleToggle = async () => {
    setOptimisticIsPlaying(!optimisticIsPlaying);
    await togglePlayback();
  };

  return (
    <div className="flex items-center space-x-6 bg-white rounded-xl shadow-lg p-6">
      <div className="relative w-48 h-48 flex-shrink-0">
        <Image
          src={track.album.images[0]?.url || '/placeholder.png'}
          alt={track.name}
          fill
          className="rounded-lg object-cover"
        />
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900">{track.name}</h1>
        <p className="text-xl text-gray-600 mt-1">
          {track.artists.map((a) => a.name).join(', ')}
        </p>
        <p className="text-sm text-gray-500 mt-2">Album: {track.album.name}</p>
        <p className="text-sm text-gray-500">
          Released: {new Date(track.album.release_date).getFullYear()}
        </p>
      </div>

      <button
        onClick={handleToggle}
        aria-label={optimisticIsPlaying ? 'Pause' : 'Play'}
        className="text-green-500 hover:text-green-600 transition"
      >
        {optimisticIsPlaying ? <FaPauseCircle size={48} /> : <FaPlayCircle size={48} />}
      </button>
    </div>
  );
}
