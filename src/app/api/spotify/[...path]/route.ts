import { NextRequest, NextResponse } from 'next/server';
import spotifyClient from '@/infrastructure/spotify/api-client';

function getApiPath(request: NextRequest) {
  const { pathname, search } = new URL(request.url);
  return pathname.replace('/api/spotify', '') + search;
}

export async function GET(request: NextRequest) {
  const apiPath = getApiPath(request);
  try {
    const client = spotifyClient();
    const res = await client.get(apiPath);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const apiPath = getApiPath(request);
  const body = await request.json().catch(() => undefined);
  try {
    const client = spotifyClient();
    const res = await client.put(apiPath, body);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiPath = getApiPath(request);
  const body = await request.json();
  try {
    const client = spotifyClient();
    const res = await client.post(apiPath, body);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const apiPath = getApiPath(request);
  try {
    const client = spotifyClient();
    const res = await client.delete(apiPath);
    if (res.status === 204) {
      return NextResponse.json({}, { status: 204 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Spotify error' },
      { status: err.response?.status || 500 }
    );
  }
}