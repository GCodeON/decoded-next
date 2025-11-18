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