import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function Callback(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { code } = req.query;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = `${process.env.BASE_URL}/api/callback`;

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        code: code as string,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      }
    );

    console.log("api token", res);

    // Handle the response, store tokens, and redirect to a protected route
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
};
