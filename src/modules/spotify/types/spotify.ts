export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width?: number; height?: number }[];
  followers?: { total: number };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string; width?: number; height?: number }[];
  artists?: { id: string; name: string }[];
  release_date?: string;
  tracks?: {
    items: SpotifyTrack[];
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string }[];
    release_date: string;
  };
  duration_ms: number;
}

export interface SpotifyRequestOptions {
  method?: string;
  body?: any;
  headers?: any
}

export interface PlaybackState {
  device?: { id?: string; name?: string };
  is_playing?: boolean;
  progress_ms?: number;
  item?: SpotifyTrack;
}

export interface SavedTracksResponse {
  items: Array<{ added_at: string; track: SpotifyTrack }>;
  limit: number;
  offset: number;
  total: number;
}

export interface SpotifySearchResult<T> {
  items: T[];
  limit: number;
  offset: number;
  total: number;
}

export interface SpotifySearchResponse {
  tracks?: SpotifySearchResult<SpotifyTrack>;
  artists?: SpotifySearchResult<SpotifyArtist>;
  albums?: SpotifySearchResult<SpotifyAlbum>;
}
