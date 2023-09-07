import { NextApiRequest, NextApiResponse } from 'next';

import axios from 'axios';
import querystring from 'querystring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  
  // Spotify API endpoints
  const SPOTIFY_API_TOKEN_URL = 'https://accounts.spotify.com/api/token';
  const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

  console.log('spotify endpoint accessed');

  res.status(200).json({ message: 'spotify!' })
  // Get access token using client credentials flow
  // const authOptions = {
  //   method: 'post',
  //   url: SPOTIFY_API_TOKEN_URL,
  //   headers: {
  //     'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //   },
  //   data: querystring.stringify({
  //     grant_type: 'client_credentials',
  //   }),
  // };

  // try {
  //   const authResponse = await axios(authOptions);
  //   const accessToken = authResponse.data.access_token;

  //   // Make a request to the Spotify Web API with the access token
  //   const apiOptions = {
  //     headers: {
  //       'Authorization': `Bearer ${accessToken}`,
  //     },
  //   };

  //   // Example: Get a list of featured playlists
  //   const response = await axios.get(`${SPOTIFY_API_BASE_URL}/browse/featured-playlists?country=US&limit=10`, apiOptions);

  //   res.status(200).json(response.data);
  // } catch (error: any) {
  //   console.error('Error:', error.message);
  //   res.status(error.response?.status || 500).json({ error: 'An error occurred' });
  // }
}
