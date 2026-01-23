// Hooks
export { useSpotifyApi } from './hooks/useSpotifyApi';
export { useSpotifyTrack } from './hooks/useSpotifyTrack';
export { usePlaybackSync } from './hooks/usePlaybackSync';
export { usePlaybackToggle } from './hooks/usePlaybackToggle';
export { useSimplePlayback } from './hooks/useSimplePlayback';
export { useSafePolling } from './hooks/useSafePolling';
export { useSyncPolling } from './hooks/useSyncPolling';
export { usePlaybackState } from './hooks/usePlaybackState';

// Services
export { createSpotifyService } from './services/spotifyService';

// Transport
export type { SpotifyTransport } from './transport/SpotifyTransport';
export { clientTransport } from './transport/clientTransport';
export { serverTransport } from './transport/serverTransport';

// Utils
export { selectTargetDevice } from './utils/deviceSelection';

// Types
export type {
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAlbum,
  SpotifyRequestOptions,
  PlaybackState,
  SavedTracksResponse
} from './types/spotify';