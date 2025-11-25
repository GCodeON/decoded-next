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
  tracks?: {
    items: SpotifyTrack[];
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
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
