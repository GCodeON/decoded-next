// Context
export { SpotifyPlayerProvider, useSpotifyPlayer } from './context/SpotifyPlayerContext';

// Components
export { default as SpotifyWebPlayer } from './components/SpotifyWebPlayer';
export { default as PlayerErrorBoundary } from './components/PlayerErrorBoundary';

// Hooks
export { useSpotifyAuthToken } from './hooks/useSpotifyAuthToken';
export { useSpotifyPlayerCallback } from './hooks/useSpotifyPlayerCallback';

// // Types (add when created)
// export type { PlayerState, DeviceState } from './types/player';