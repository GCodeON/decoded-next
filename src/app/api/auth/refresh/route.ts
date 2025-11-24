import { NextRequest, NextResponse } from 'next/server';
import { tokenRefresh } from '@/hooks/useSpotifyApi';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const response = await tokenRefresh(refreshToken);

    if (!response.ok) {
      const text = await response.text();
      console.error('Spotify refresh failed:', response.status, text);
      throw new Error(`Refresh failed with status ${response.status}`);
    }

    // Check content-type to ensure we have JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Spotify returned non-JSON response:', text.substring(0, 200));
      throw new Error('Invalid response from Spotify (expected JSON)');
    }

    const data = await response.json();

    const expiresAt = Date.now() + data.expires_in * 1000;

    const res = NextResponse.json({ success: true });
    res.cookies.set('spotify_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.expires_in,
    });

    if (data.refresh_token) {
      res.cookies.set('spotify_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    res.cookies.set('spotify_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
  }
}