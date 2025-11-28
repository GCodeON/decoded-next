export const LRCLIB_BASE_URL = 'https://lrclib.net/api';

export const LrcLib = {
  requestChallenge: () => `${LRCLIB_BASE_URL}/request-challenge`,
  publish: () => `${LRCLIB_BASE_URL}/publish`,
  get: (params: { artist: string; track: string; album: string; duration: string }) =>
    `${LRCLIB_BASE_URL}/get?artist_name=${encodeURIComponent(params.artist)}&track_name=${encodeURIComponent(params.track)}&album_name=${encodeURIComponent(params.album)}&duration=${encodeURIComponent(params.duration)}`,
};
