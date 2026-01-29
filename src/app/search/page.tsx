'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useSpotifyApi, SpotifySearchResponse } from '@/modules/spotify';

const FULL_RESULTS_LIMIT = 50;

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

export default function SearchPage() {
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Search</h1>
        <p className="mt-1 text-sm text-white/60">
          {query ? `Showing results for “${query}”` : 'Type in the top bar to search Spotify.'}
        </p>
      </div>

      {isLoading && <div className="text-sm text-white/60">Searching…</div>}
      {!isLoading && error && <div className="text-sm text-red-400">{error}</div>}

      {!isLoading && !error && query && tracks.length === 0 && artists.length === 0 && albums.length === 0 && (
        <div className="text-sm text-white/60">No results found.</div>
      )}

      {!isLoading && !error && query && (
        <div className="space-y-8">
          {tracks.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">Songs</h2>
              <ul className="space-y-2">
                {tracks.map((track) => (
                  <li key={track.id}>
                    <Link href={`/songs/${track.id}`} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10">
                      <ResultImage src={track.album?.images?.[0]?.url} alt={track.name} />
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">{track.name}</div>
                        <div className="truncate text-xs text-white/50">
                          {track.artists?.map((artist) => artist.name).join(', ')}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {artists.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">Artists</h2>
              <ul className="space-y-2">
                {artists.map((artist) => (
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

          {albums.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">Albums</h2>
              <ul className="space-y-2">
                {albums.map((album) => (
                  <li key={album.id}>
                    <Link href={`/albums/${album.id}`} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10">
                      <ResultImage src={album.images?.[0]?.url} alt={album.name} />
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">{album.name}</div>
                        {album.artists?.length ? (
                          <div className="truncate text-xs text-white/50">
                            {album.artists.map((artist) => artist.name).join(', ')}
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
