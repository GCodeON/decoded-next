import { NextRequest, NextResponse } from 'next/server';
import { spotifyAuthService } from '@/modules/auth/services/spotifyAuthService';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const data = await spotifyAuthService.refreshAccessToken(refreshToken);

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

    const message = err instanceof Error ? err.message : 'Refresh failed';
    const lower = message.toLowerCase();

    if (lower.includes('invalid client') || lower.includes('missing spotify client credentials')) {
      return NextResponse.json(
        { error: 'Spotify client credentials are invalid or missing' },
        { status: 500 }
      );
    }

    if (lower.includes('invalid_grant')) {
      const res = NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 0,
      };

      res.cookies.set('spotify_access_token', '', cookieOptions);
      res.cookies.set('spotify_refresh_token', '', cookieOptions);
      res.cookies.set('spotify_expires_at', '', cookieOptions);
      return res;
    }

    return NextResponse.json({ error: 'Refresh failed' }, { status: 502 });
  }
}