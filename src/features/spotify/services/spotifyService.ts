import { spotifyEndpoints } from '@/infrastructure/spotify/endpoints';
import type { SpotifyTransport } from '../transport/SpotifyTransport';
import type { 
  SpotifyTrack, 
  SpotifyArtist, 
  SpotifyAlbum, 
  PlaybackState, 
  SavedTracksResponse 
} from '../types/spotify';

/**
 * Factory function to create a Spotify service with injected transport.
 * Allows same business logic to work in both client (fetch) and server (axios) contexts.
 */
export function createSpotifyService(transport: SpotifyTransport) {
  return {
    async getTrack(trackId: string): Promise<SpotifyTrack> {
      return transport.request<SpotifyTrack>('GET', spotifyEndpoints.track(trackId));
    },

    async getCurrentlyPlaying(): Promise<SpotifyTrack | null> {
      const data = await transport.request<{ item?: SpotifyTrack }>('GET', spotifyEndpoints.currentlyPlaying());
      return data?.item ?? null;
    },

    async getPlaybackState(): Promise<PlaybackState> {
      return transport.request<PlaybackState>('GET', spotifyEndpoints.playback());
    },

    async getUserTracks(limit = 50, offset = 0): Promise<SavedTracksResponse> {
      return transport.request<SavedTracksResponse>('GET', spotifyEndpoints.userTracks(limit, offset));
    },

    async getAlbum(albumId: string): Promise<SpotifyAlbum> {
      return transport.request<SpotifyAlbum>('GET', spotifyEndpoints.album(albumId));
    },

    async getArtist(artistId: string): Promise<SpotifyArtist> {
      return transport.request<SpotifyArtist>('GET', spotifyEndpoints.artist(artistId));
    },

    async getTopArtists(limit = 20): Promise<{ items: SpotifyArtist[] }> {
      return transport.request<{ items: SpotifyArtist[] }>('GET', spotifyEndpoints.topArtists(limit));
    },

    async getArtistAlbums(artistId: string): Promise<{ items: SpotifyAlbum[] }> {
      return transport.request<{ items: SpotifyAlbum[] }>('GET', spotifyEndpoints.artistAlbums(artistId));
    },

    async play(deviceId?: string, uris?: string[], position_ms?: number): Promise<void> {
      await transport.request('PUT', spotifyEndpoints.play(deviceId), { uris, position_ms });
    },

    async pause(deviceId?: string): Promise<void> {
      await transport.request('PUT', spotifyEndpoints.pause(deviceId));
    },
  };
}