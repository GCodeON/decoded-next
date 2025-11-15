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