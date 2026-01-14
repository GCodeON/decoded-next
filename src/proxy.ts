import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  if (url.hostname === '127.0.0.1') {
    const newUrl = new URL(url.toString());
    newUrl.hostname = 'localhost';
    return NextResponse.redirect(newUrl, { status: 307 });
  }

  const shouldHandle =
    path.startsWith('/api/spotify') ||
    path.startsWith('/player') ||
    path.startsWith('/api/auth/token');

  if (!shouldHandle) {
    return NextResponse.next();
  }

  const expiresAt = req.cookies.get('spotify_expires_at')?.value;
  const accessToken = req.cookies.get('spotify_access_token')?.value;
  const refreshToken = req.cookies.get('spotify_refresh_token')?.value;
  const now = Date.now();
  

  if (!refreshToken) {
    if (path.startsWith('/api')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (!accessToken || !expiresAt || now > Number(expiresAt) - 5 * 60 * 1000) {
    const refresh = await fetch(new URL('/api/auth/refresh', req.url), {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    });

    if (!refresh.ok) {
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const response = NextResponse.next();
    refresh.headers.forEach((v, k) => {
      if (k === 'set-cookie') {
        const [nameVal] = v.split(';');
        const [name, val] = nameVal.split('=');
        response.cookies.set(name, val, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      }
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/(.*)'],
};
