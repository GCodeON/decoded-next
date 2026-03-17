'use client';
import { useState, useMemo } from 'react';
import type { SavedSong } from '@/modules/lyrics';

export type FilterType = 'all' | 'youtube' | 'complete';

type SongWithId = SavedSong & { id: string };

export function useEncodedSongsFilter(songs: SongWithId[], pageSize: number) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      if (activeFilter === 'youtube') return typeof song.youtubeUrl === 'string' && song.youtubeUrl.trim() !== '';
      if (activeFilter === 'complete') return song.lyrics?.rhymeColorMappingComplete === true;
      return true;
    });
  }, [songs, activeFilter]);

  const totalPages = Math.ceil(filteredSongs.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pageSongs = filteredSongs.slice((safePage - 1) * pageSize, safePage * pageSize);

  function changeFilter(filter: FilterType) {
    setActiveFilter(filter);
    setCurrentPage(1);
  }

  function prevPage() {
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  function nextPage() {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }

  return {
    activeFilter,
    changeFilter,
    filteredSongs,
    pageSongs,
    currentPage: safePage,
    totalPages,
    prevPage,
    nextPage,
  };
}
