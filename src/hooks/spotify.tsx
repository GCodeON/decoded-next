import axios from 'axios';
import querystring from 'querystring';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI =  process.env.SPOTIFY_REDIRECT_URI;

export const useAuth = () => {
  const login = () => {
    const AuthEndPoint = 'https://accounts.spotify.com/authorize';

    const scopes = [
      "streaming",
      "user-read-currently-playing",
      "user-read-recently-played",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-playback-position",
      "user-top-read",
      "user-library-read",
      "user-read-private",
      "user-read-email"
    ];


    const authUrl = `${AuthEndPoint}?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${SPOTIFY_REDIRECT_URI}&scope=${scopes.join("%20")}&response_type=code`;
    // const authUrl = `${AuthEndPoint}?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${SPOTIFY_REDIRECT_URI}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`;

    window.location.href = authUrl;
  };

  const logout = () => {
    // Implement logout logic if needed
  };

  return { login, logout };
};

export const getAccessToken = async (code: any) => {
  const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

  const response = await axios.post(SPOTIFY_TOKEN_ENDPOINT, null, {
    params: {
        grant_type  : 'authorization_code',
        code        : code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
    },
    headers: {
        Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
};

export const spotifyApi = async (endpoint: string, accessToken: string) => {

  const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log('response spotify', response);
  return response.data;
};