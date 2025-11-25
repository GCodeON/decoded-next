// Hooks
export { useSpotifyApi } from './hooks/useSpotifyApi';
export { useSpotifyTrack } from './hooks/useSpotifyTrack';
export { usePlaybackSync } from './hooks/usePlaybackSync';

// Services
export { createSpotifyService } from './services/spotifyService';

// Transport
export type { SpotifyTransport } from './transport/SpotifyTransport';
export { clientTransport } from './transport/clientTransport';
export { serverTransport } from './transport/serverTransport';

// Types
export type {
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAlbum,
  SpotifyRequestOptions,
  PlaybackState,
  SavedTracksResponse
} from './types/spotify';