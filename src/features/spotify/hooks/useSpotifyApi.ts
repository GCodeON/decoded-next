import { useMemo } from 'react';
import { clientTransport } from '../transport/clientTransport';
import { createSpotifyService } from '../services/spotifyService';

/**
 * React hook providing Spotify service methods for client-side usage.
 * Uses fetch-based transport via Next.js API proxy routes.
 */
export const useSpotifyApi = () => {
  const service = useMemo(() => createSpotifyService(clientTransport), []);
  return service;
};
