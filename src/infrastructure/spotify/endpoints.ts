// Centralized Spotify endpoint builders
export const spotifyEndpoints = {
  track: (id: string) => `/tracks/${id}`,
  album: (id: string) => `/albums/${id}`,
  artist: (id: string) => `/artists/${id}`,
  artistAlbums: (id: string) => `/artists/${id}/albums`,
  topArtists: (limit = 20) => `/me/top/artists?limit=${limit}`,
  playback: () => '/me/player',
  currentlyPlaying: () => '/me/player/currently-playing',
  play: (deviceId?: string) =>
    deviceId ? `/me/player/play?device_id=${encodeURIComponent(deviceId)}` : '/me/player/play',
  pause: (deviceId?: string) =>
    deviceId ? `/me/player/pause?device_id=${encodeURIComponent(deviceId)}` : '/me/player/pause',
  userTracks: (limit = 50, offset = 0) => `/me/tracks?limit=${limit}&offset=${offset}`,
};
