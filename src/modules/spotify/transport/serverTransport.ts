import { createSpotifyAxios } from '@/lib/spotify/client';
import type { SpotifyTransport } from './SpotifyTransport';

/**
 * Server-side transport using Axios with direct Spotify API access.
 * Includes automatic token refresh via interceptors.
 */
export const serverTransport: SpotifyTransport = {
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const client = createSpotifyAxios();
    const res = await client.request({
      method,
      url: path,
      data: body,
    });
    return res.data as T;
  },
};
