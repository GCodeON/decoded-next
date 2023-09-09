import { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from "next/server";

import axios from 'axios';
import querystring from 'querystring';


export async function GET(req: Request, res: NextApiResponse) {

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  
  // Spotify API endpoints
  const SPOTIFY_API_TOKEN_URL = 'https://accounts.spotify.com/api/token';
  const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';


  // Get access token using client credentials flow
  const authOptions = {
    method : 'post',
    url    : SPOTIFY_API_TOKEN_URL,
    headers: {
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      'Content-Type' : 'application/x-www-form-urlencoded',
    },
    data: querystring.stringify({
      grant_type: 'client_credentials',
    }),
  };

  try {
    const authResponse = await axios(authOptions);
    const accessToken = authResponse.data.access_token;

    // Make a request to the Spotify Web API with the access token
    const apiOptions = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    // TODO: Seperate Endpoint API Call 
    
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')
    console.log('spotify token req', endpoint);

    const response = await axios.get(`${SPOTIFY_API_BASE_URL}${endpoint}`, apiOptions);


    return NextResponse.json({ data: response.data }, { status: 200 });

    // res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred', status: error.response?.status }, { status: error.response?.status });
  }
}


