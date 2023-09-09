import { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from "next/server";

import axios from 'axios';
import querystring from 'querystring';


const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = process.env;

export async function GET(req: Request, res: NextApiResponse) {

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  console.log('get code', code);
  try {
    const authData = querystring.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    });

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      authData,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    console.log('acess', access_token)
    // You can store the tokens in a secure way (e.g., in a database or session)
    // and redirect to your app's main page.

    res.redirect(`/?access_token=${access_token}&refresh_token=${refresh_token}`);

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred', status: error.response?.status }, { status: error.response?.status });
  }
};
