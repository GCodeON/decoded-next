import { NextRequest, NextResponse } from 'next/server';
import spotifyClient from '@/lib/spotify-client';

export async function GET(request: NextRequest) {
  const { pathname, search } = new URL(request.url);
  const apiPath = pathname.replace('/api/spotify', '') + search;

  try {
    const client = spotifyClient();
    const res = await client.get(apiPath);
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}