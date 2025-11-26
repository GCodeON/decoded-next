import { useMemo } from 'react';
import { clientTransport, createSpotifyService } from '@/modules/spotify';

/**
 * React hook providing Spotify service methods for client-side usage.
 * Uses fetch-based transport via Next.js API proxy routes.
 */
export const useSpotifyApi = () => {
  const service = useMemo(() => createSpotifyService(clientTransport), []);
  return service;
};
