import spotifyApiClient from '@/infrastructure/spotify/api-client';
import type { SpotifyTrack, SpotifyArtist, SpotifyAlbum } from '../types/spotify';

export const spotifyService = {
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return spotifyApiClient(`/tracks/${trackId}`);
  },

  async getCurrentlyPlaying() {
    return spotifyApiClient('/me/player/currently-playing');
  },

  async getPlaybackState() {
    return spotifyApiClient('/me/player');
  },

  async getUserTracks(limit = 50, offset = 0) {
    return spotifyApiClient(`/me/tracks?limit=${limit}&offset=${offset}`);
  },

  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return spotifyApiClient(`/albums/${albumId}`);
  },

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return spotifyApiClient(`/artists/${artistId}`);
  },

  async play(deviceId?: string, uris?: string[], position_ms?: number) {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId);
    
    return spotifyApiClient(`/me/player/play?${params}`, {
      method: 'PUT',
      body: JSON.stringify({ uris, position_ms }),
    });
  },

  async pause(deviceId?: string) {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId);
    
    return spotifyApiClient(`/me/player/pause?${params}`, {
      method: 'PUT',
    });
  },
};