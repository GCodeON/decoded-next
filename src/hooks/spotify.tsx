import axios from 'axios';
import querystring from 'querystring';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

export const useAuth = () => {
  // const clientId = process.env.SPOTIFY_CLIENT_ID;
  // const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const login = () => {
    const AuthEndPoint = 'https://accounts.spotify.com/authorize';
    // const redirectUri  = 'http://localhost:3000/callback/';

    const scopes = [
      "streaming",
      "user-read-currently-playing",
      "user-read-recently-played",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-playback-position",
      "user-top-read",
      "user-library-read"
    ];


    const authUrl = `${AuthEndPoint}?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${SPOTIFY_REDIRECT_URI}&scope=${scopes.join("%20")}&response_type=code`;
    // const authUrl = `${AuthEndPoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`;

    window.location.href = authUrl;
  };

  const logout = () => {
    // Implement logout logic if needed
  };

  return { login, logout };
};

export const getAccessToken = async (code: any) => {

  const SPOTIFY_TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

  // console.log('access', SPOTIFY_CLIENT_ID);


    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
  params: {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
  },
  headers: {
      Authorization: `Basic ${Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
  },
  });

  console.log('hook access', response.data);


  return response.data.access_token;


  // axios({
  //   method: 'post',
  //   url   : SPOTIFY_TOKEN_ENDPOINT,
  //   data: querystring.stringify({
  //     grant_type  : 'authorization_code',
  //     code        : code,
  //     redirect_uri: SPOTIFY_REDIRECT_URI
  //   }),
  //   headers: {
  //     Authorization: `Basic ${Buffer.from(
  //     `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  //     ).toString('base64')}`,
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //   },
  // }).then(res => {
  //   console.log('res access', res);
  //   return res.data.access_token;
  // }).catch(error => {
  //   console.log('res error', error)
  // })
};