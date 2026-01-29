'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useSpotifyApi, SpotifySearchResponse } from '@/modules/spotify';

const FULL_RESULTS_LIMIT = 5;

function ResultImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold text-white/70">
        {alt?.slice(0, 1) ?? '?'}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? 'cover'}
      width={48}
      height={48}
      className="h-12 w-12 rounded-lg object-cover"
    />
  );
}

export default function SearchContent() {
  const spotify = useSpotifyApi();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const query = queryParam.trim();

  const [results, setResults] = useState<SpotifySearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!query) {
      setResults(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    spotify
      .search(query, { limit: FULL_RESULTS_LIMIT })
      .then((data) => {
        if (requestId !== requestIdRef.current) return;
        setResults(data);
        setError(null);
      })
      .catch((err: any) => {
        if (requestId !== requestIdRef.current) return;
        setResults(null);
        setError(err?.message ?? 'Search failed');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  }, [query, spotify]);

  const tracks = results?.tracks?.items ?? [];
  const artists = results?.artists?.items ?? [];
  const albums = results?.albums?.items ?? [];

  // Filter tracks by title relevance
  const filteredTracks = tracks.filter((track) =>
    track.name.toLowerCase().includes(query.toLowerCase())
  );

  // Filter albums to prefer deluxe versions for duplicate titles by same artist
  const filteredAlbums = useMemo(() => {
    const albumsByTitleAndArtist = new Map<string, typeof albums>();
    
    // Group albums by base title AND main artist
    albums.forEach((album) => {
      const baseTitle = album.name
        .replace(/\s*\(Explicit\)\s*/i, '')
        .replace(/\s*\(Deluxe[^)]*\)\s*/i, '')
        .replace(/\s*\(Remaster[^)]*\)\s*/i, '')
        .trim();
      
      const mainArtist = album.artists?.[0]?.name ?? 'Unknown';
      const key = `${baseTitle}|${mainArtist}`;
      
      if (!albumsByTitleAndArtist.has(key)) {
        albumsByTitleAndArtist.set(key, []);
      }
      albumsByTitleAndArtist.get(key)!.push(album);
    });
    
    // For each title+artist combo, keep only deluxe/explicit if it exists
    const result: typeof albums = [];
    albumsByTitleAndArtist.forEach((group) => {
      const hasSpecialVersion = group.some((album) =>
        /\(Explicit\)|\(Deluxe[^)]*\)|\(Remaster[^)]*\)/i.test(album.name)
      );
      
      if (hasSpecialVersion) {
        const specialVersions = group.filter((album) =>
          /\(Explicit\)|\(Deluxe[^)]*\)|\(Remaster[^)]*\)/i.test(album.name)
        );
        result.push(specialVersions[0]);
      } else {
        result.push(group[0]);
      }
    });
    
    return result;
  }, [albums]);

  const enrichedArtists = useMemo(() => {
    const artistMap = new Map<string, any>();
    const prioritizedIds = new Set<string>();
    
    // Prioritize artists from top track and album results
    const topTrackArtists = tracks[0]?.artists ?? [];
    const topAlbumArtists = filteredAlbums[0]?.artists ?? [];
    const topAlbumImages = filteredAlbums[0]?.images ?? [];
    
    [...topTrackArtists, ...topAlbumArtists].forEach((artist) => {
      prioritizedIds.add(artist.id);
      artistMap.set(artist.id, {
        id: artist.id,
        name: artist.name,
        images: (artist as any).images ?? topAlbumImages,
      });
    });
    
    // Add direct artist search results
    artists.forEach((artist) => {
      if (!artistMap.has(artist.id)) {
        artistMap.set(artist.id, artist);
      }
    });
    
    // Add artists from matching tracks
    tracks.forEach((track) => {
      track.artists?.forEach((artist) => {
        if (!artistMap.has(artist.id)) {
          artistMap.set(artist.id, {
            ...artist,
            images: [],
          });
        }
      });
    });
    
    // Add artists from matching albums and use album images as fallback
    filteredAlbums.forEach((album) => {
      album.artists?.forEach((artist) => {
        if (!artistMap.has(artist.id)) {
          artistMap.set(artist.id, {
            ...artist,
            images: album.images ?? [],
          });
        } else {
          const existing = artistMap.get(artist.id);
          if (!existing.images || existing.images.length === 0) {
            existing.images = album.images ?? [];
          }
        }
      });
    });
    
    // Return with prioritized artists first, limited to 5
    const result = Array.from(artistMap.values());
    const prioritized = result.filter((a) => prioritizedIds.has(a.id));
    const rest = result.filter((a) => !prioritizedIds.has(a.id));
    return [...prioritized, ...rest].slice(0, 5);
  }, [artists, tracks, filteredAlbums]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Search</h1>
        <p className="mt-1 text-sm text-white/60">
          {query ? `Showing results for "${query}"` : 'Type in the top bar to search Spotify.'}
        </p>
      </div>

      {isLoading && <div className="text-sm text-white/60">Searching…</div>}
      {!isLoading && error && <div className="text-sm text-red-400">{error}</div>}

      {!isLoading && !error && query && filteredTracks.length === 0 && enrichedArtists.length === 0 && filteredAlbums.length === 0 && (
        <div className="text-sm text-white/60">No results found.</div>
      )}

      {!isLoading && !error && query && (
        <div className="flex flex-col gap-8 md:grid md:grid-cols-3 md:gap-6">
          {filteredTracks.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">Songs</h2>
              <ul className="space-y-2">
                {filteredTracks.map((track) => (
                  <li key={track.id}>
                    <Link href={`/songs/${track.id}`} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10">
                      <ResultImage src={track.album?.images?.[0]?.url} alt={track.name} />
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">{track.name}</div>
                        <div className="truncate text-xs text-white/50">
                          {track.artists?.[0]?.name}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {enrichedArtists.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">Artists</h2>
              <ul className="space-y-2">
                {enrichedArtists.map((artist) => (
                  <li key={artist.id}>
                    <Link href={`/artists/${artist.id}`} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10">
                      <ResultImage src={artist.images?.[0]?.url} alt={artist.name} />
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">{artist.name}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filteredAlbums.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">Albums</h2>
              <ul className="space-y-2">
                {filteredAlbums.map((album) => (
                  <li key={album.id}>
                    <Link href={`/albums/${album.id}`} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10">
                      <ResultImage src={album.images?.[0]?.url} alt={album.name} />
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">{album.name}</div>
                        {album.artists?.length ? (
                          <div className="truncate text-xs text-white/50">
                            {album.artists[0]?.name}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
