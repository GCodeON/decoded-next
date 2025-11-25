import { NextRequest, NextResponse } from 'next/server';
import { spotifyAuthService } from '@/features/auth/services/spotifyAuthService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  try {
    const data = await spotifyAuthService.exchangeCodeForTokens(
      code,
      process.env.SPOTIFY_REDIRECT_URI!
    );

    const expiresAt = Date.now() + data.expires_in * 1000;

    const res = NextResponse.redirect(new URL('/', request.url));

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
    console.error('Auth callback error:', err);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}