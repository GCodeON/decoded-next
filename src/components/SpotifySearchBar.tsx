'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSpotifyApi, SpotifySearchResponse } from '@/modules/spotify';

const RESULTS_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]).join('');
  return initials.toUpperCase();
}

function ResultImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-xs font-semibold text-white/70">
        {getInitials(alt)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? 'cover'}
      width={36}
      height={36}
      className="h-9 w-9 rounded-md object-cover"
    />
  );
}

export default function SpotifySearchBar({ className = '', isMobile = false }: { className?: string; isMobile?: boolean }) {
  const spotify = useSpotifyApi();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifySearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const shouldSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const tracks = results?.tracks?.items ?? [];
  const artists = results?.artists?.items ?? [];
  const albums = results?.albums?.items ?? [];
  const hasResults = tracks.length > 0 || artists.length > 0 || albums.length > 0;

  useEffect(() => {
    setIsOpen(false);
    setIsExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobile && query.length === 0 && !isOpen) {
      setIsExpanded(false);
    }
  }, [query, isOpen, isMobile]);

  useEffect(() => {
    if (isMobile && isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded, isMobile]);

  useEffect(() => {
    if (!shouldSearch) {
      setResults(null);
      setError(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    const requestId = ++requestIdRef.current;
    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await spotify.search(trimmedQuery, { limit: RESULTS_LIMIT });
        if (requestId !== requestIdRef.current) return;
        setResults(data);
        setError(null);
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        setResults(null);
        setError(err?.message ?? 'Search failed');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [shouldSearch, trimmedQuery, spotify]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        if (isMobile && query.length === 0) {
          setIsExpanded(false);
        }
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, query]);

  const viewAllHref = useMemo(() => {
    if (!shouldSearch) return '/search';
    return `/search?q=${encodeURIComponent(trimmedQuery)}`;
  }, [shouldSearch, trimmedQuery]);

  // Mobile: Show icon only initially
  if (isMobile && !isExpanded) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Open search"
        >
          <svg
            className="h-5 w-5 text-white/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Mobile expanded or desktop: Show full search bar
  if (isMobile && isExpanded) {
    return (
      <div ref={containerRef} className={`relative w-full ${className}`}>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (query.length === 0) {
                setIsExpanded(false);
              }
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            aria-label="Close search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (shouldSearch) setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsOpen(false);
                if (query.length === 0) setIsExpanded(false);
              }
            }}
            placeholder={isMobile ? "Search" : "Search songs, artists, albums"}
            className="w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/10 bg-black/95 p-4 shadow-lg backdrop-blur">
            {isLoading && (
              <div className="text-sm text-white/60">Searching…</div>
            )}

            {!isLoading && error && (
              <div className="text-sm text-red-400">{error}</div>
            )}

            {!isLoading && !error && !hasResults && (
              <div className="text-sm text-white/60">No results found.</div>
            )}

            {!isLoading && !error && hasResults && (
              <div className="space-y-4">
                {tracks.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Songs</div>
                    <ul className="space-y-2">
                      {tracks.map((track) => (
                        <li key={track.id}>
                          <Link
                            href={`/songs/${track.id}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                            onClick={() => setIsOpen(false)}
                          >
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
                  </div>
                )}

                {artists.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Artists</div>
                    <ul className="space-y-2">
                      {artists.map((artist) => (
                        <li key={artist.id}>
                          <Link
                            href={`/artists/${artist.id}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                            onClick={() => setIsOpen(false)}
                          >
                            <ResultImage src={artist.images?.[0]?.url} alt={artist.name} />
                            <div className="min-w-0">
                              <div className="truncate text-sm text-white">{artist.name}</div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {albums.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Albums</div>
                    <ul className="space-y-2">
                      {albums.map((album) => (
                        <li key={album.id}>
                          <Link
                            href={`/albums/${album.id}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                            onClick={() => setIsOpen(false)}
                          >
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
                  </div>
                )}
              </div>
            )}

            {shouldSearch && (
              <div className="mt-4 border-t border-white/10 pt-3 text-right">
                <Link
                  href={viewAllHref}
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold uppercase tracking-wide text-blue-400 hover:text-blue-300"
                >
                  View all results
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Show full search bar
  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (shouldSearch) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder="Search songs, artists, albums"
          className="w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/10 bg-black/95 p-4 shadow-lg backdrop-blur">
          {isLoading && (
            <div className="text-sm text-white/60">Searching…</div>
          )}

          {!isLoading && error && (
            <div className="text-sm text-red-400">{error}</div>
          )}

          {!isLoading && !error && !hasResults && (
            <div className="text-sm text-white/60">No results found.</div>
          )}

          {!isLoading && !error && hasResults && (
            <div className="space-y-4">
              {tracks.length > 0 && (
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Songs</div>
                  <ul className="space-y-2">
                    {tracks.map((track) => (
                      <li key={track.id}>
                        <Link
                          href={`/songs/${track.id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          onClick={() => setIsOpen(false)}
                        >
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
                </div>
              )}

              {artists.length > 0 && (
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Artists</div>
                  <ul className="space-y-2">
                    {artists.map((artist) => (
                      <li key={artist.id}>
                        <Link
                          href={`/artists/${artist.id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          onClick={() => setIsOpen(false)}
                        >
                          <ResultImage src={artist.images?.[0]?.url} alt={artist.name} />
                          <div className="min-w-0">
                            <div className="truncate text-sm text-white">{artist.name}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {albums.length > 0 && (
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Albums</div>
                  <ul className="space-y-2">
                    {albums.map((album) => (
                      <li key={album.id}>
                        <Link
                          href={`/albums/${album.id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          onClick={() => setIsOpen(false)}
                        >
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
                </div>
              )}
            </div>
          )}

          {shouldSearch && (
            <div className="mt-4 border-t border-white/10 pt-3 text-right">
              <Link
                href={viewAllHref}
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold uppercase tracking-wide text-blue-400 hover:text-blue-300"
              >
                View all results
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}