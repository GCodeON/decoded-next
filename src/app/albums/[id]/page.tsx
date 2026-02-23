'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { useSpotifyApi, useSimplePlayback } from '@/modules/spotify';
import { SpotifyAlbum, SpotifyTrack } from '@/modules/spotify/types/spotify';
import { useUserPremium } from '@/modules/auth/hooks/useUserPremium';
import { AlbumTrackRow } from '@/modules/player/components/AlbumTrackRow';
// import { useWaveformRhymeRegions } from '@/modules/lyrics/components/WaveformRhymeRegions';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FiMusic, FiCalendar, FiDisc } from 'react-icons/fi';

export default function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState<SpotifyAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const spotify = useSpotifyApi();
  const isPremium = useUserPremium();

  useEffect(() => {
    const getAlbum = async () => {
      try {
        setLoading(true);
        const albumData = await spotify.getAlbum(id);
        
        if (albumData) {
          console.log('Album data:', albumData);
          setAlbum(albumData);
        }
      } catch (error) {
        console.error('Error fetching album:', error);
      } finally {
        setLoading(false);
      }
    };
    getAlbum();
  }, [id, spotify]);

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrackId(selectedTrackId === trackId ? null : trackId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiDisc className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-700">Album not found</h2>
        </div>
      </div>
    );
  }

  const albumImage = album.images?.[0]?.url || '/placeholder-album.png';
  const artistNames = album.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : '';
  const totalTracks = album.tracks?.items.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-black">
      {/* Album Header */}
      <div className="bg-gradient-to-b from-black to-black-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Album Artwork */}
            <div className="flex-shrink-0">
              <div className="w-64 h-64 rounded-lg shadow-2xl overflow-hidden">
                <Image
                  src={albumImage}
                  alt={album.name}
                  width={256}
                  height={256}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </div>

            {/* Album Info */}
            <div className="flex-1">
              <div className="text-sm font-semibold uppercase tracking-wide mb-2">Album</div>
              <h1 className="text-5xl font-bold mb-4">{album.name}</h1>
              <div className="flex items-center gap-4 text-lg mb-6">
                <span className="font-semibold">{artistNames}</span>
                {releaseYear && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <FiCalendar size={16} />
                      <span>{releaseYear}</span>
                    </div>
                  </>
                )}
                <span>•</span>
                <div className="flex items-center gap-2">
                  <FiMusic size={16} />
                  <span>{totalTracks} tracks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {album.tracks?.items.map((track, index) => (
            <AlbumTrackRowWithRhymes
              key={track.id}
              track={track}
              album={album}
              trackNumber={index + 1}
              isSelected={selectedTrackId === track.id}
              onSelect={() => handleTrackSelect(track.id)}
              isPremium={isPremium}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component that fetches rhyme regions for a track
 */
function AlbumTrackRowWithRhymes({
  track,
  album,
  trackNumber,
  isSelected,
  onSelect,
  isPremium,
}: {
  track: SpotifyTrack;
  album: SpotifyAlbum;
  trackNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  isPremium: boolean;
}) {
  const { isPlaying, togglePlayback } = useSimplePlayback(track.id);

  // Enhance track with album data for useSavedSong hook
  const enhancedTrack: SpotifyTrack = {
    ...track,
    album: {
      name: album.name,
      images: album.images || [],
      release_date: album.release_date || '',
    },
  };

  // const { regions, loading } = useWaveformRhymeRegions({
  //   trackId: track.id,
  //   track: enhancedTrack,
  // });

  return (
    <AlbumTrackRow
      track={track}
      trackNumber={trackNumber}
      isSelected={isSelected}
      isPlaying={isPlaying}
      onSelect={onSelect}
      onTogglePlay={togglePlayback}
    />
  );
}

