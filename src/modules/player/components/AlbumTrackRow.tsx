'use client';

import Link from 'next/link';
import { SpotifyTrack } from '@/modules/spotify/types/spotify';
import { FiPlay, FiPause, FiChevronDown, FiChevronUp, FiMusic } from 'react-icons/fi';

export interface AlbumTrackRowProps {
  track: SpotifyTrack;
  trackNumber: number;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onTogglePlay?: () => void;
}

/**
 * Album track row component with expandable waveform
 * Shows mini waveform by default, expands to full interactive waveform when selected
 */
export function AlbumTrackRow({
  track,
  trackNumber,
  isSelected,
  isPlaying,
  onSelect,
  onTogglePlay,
}: AlbumTrackRowProps) {


  // // Use Spotify's 30-second preview URL for waveform visualization
  // const audioUrl = track.preview_url;

  // const hasAudio = !!audioUrl;

  // Format duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


  return (
    <div className={`album-track-row border-b border-gray-200 transition-all ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
      {/* Compact View */}
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={onSelect}
      >
        {/* Track Number / Play Button */}
        <div className="w-8 flex-shrink-0 text-center">
          {isSelected ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay?.();
              }}
              className="text-purple-600 hover:text-purple-700"
            >
              {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
            </button>
          ) : (
            <span className="text-gray-500 text-sm">{trackNumber}</span>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/songs/${track.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block font-medium text-gray-900 truncate hover:underline"
          >
            {track.name}
          </Link>
          <div className="text-sm text-gray-600 truncate">
            {track.artists.map((artist, index) => (
              <span key={artist.id ?? `${artist.name}-${index}`}>
                {index > 0 && ', '}
                {artist.id ? (
                  <Link
                    href={`/artists/${artist.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                  >
                    {artist.name}
                  </Link>
                ) : (
                  artist.name
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="text-sm text-gray-500 flex-shrink-0 w-16 text-right">
          {formatDuration(track.duration_ms)}
        </div>

        {/* Expand/Collapse Icon */}
        <div className="text-gray-400 flex-shrink-0">
          {isSelected ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </div>

    </div>
  );
}
