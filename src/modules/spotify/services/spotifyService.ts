import { spotifyEndpoints } from '@/lib/spotify/endpoints';
import { 
  SpotifyTransport, 
  SpotifyTrack, 
  SpotifyArtist, 
  SpotifyAlbum, 
  PlaybackState, 
  SavedTracksResponse  
} from '@/modules/spotify';

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

    /**
     * Unified playback snapshot: primary call to /me/player, optional lightweight
     * fallback to /currently-playing if the player response has no item (e.g. brief gap
     * right after pause/resume). This prevents double polling in higher layers while still
     * keeping track info available.
     */
    async getPlaybackSnapshot(): Promise<{
      state: PlaybackState | null;
      trackId: string | null;
      isPlaying: boolean;
      progressSec: number | null;
      deviceId: string | null;
    }> {
      let state: PlaybackState | null = null;
      try {
        state = await this.getPlaybackState();
      } catch {
        state = null;
      }

      let item: SpotifyTrack | null | undefined = state?.item;
      let isPlaying = !!state?.is_playing;

      // Fallback: only attempt if no item; ignore errors silently.
      if (!item) {
        try {
          const current = await this.getCurrentlyPlaying();
          if (current) item = current;
        } catch {}
      }

      const trackId = item?.id || null;
      const progressSec = typeof state?.progress_ms === 'number'
        ? Math.floor(state.progress_ms / 1000)
        : null;
      const deviceId = state?.device?.id || null;

      return { state, trackId, isPlaying, progressSec, deviceId };
    },

    async getDevices(): Promise<{ devices: any[] }> {
      return transport.request<{ devices: any[] }>('GET', spotifyEndpoints.devices());
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

    async transferPlayback(deviceId: string, play: boolean = true): Promise<void> {
      await transport.request('PUT', spotifyEndpoints.transferPlayback(), {
        device_ids: [deviceId],
        play,
      });
    },
  };
}