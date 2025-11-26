import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const shouldHandle =
    path.startsWith('/api/spotify') ||
    path.startsWith('/player') ||
    path.startsWith('/api/auth/token');

  if (!shouldHandle) {
    return NextResponse.next();
  }

  const expiresAt = req.cookies.get('spotify_expires_at')?.value;
  const accessToken = req.cookies.get('spotify_access_token')?.value;
  const now = Date.now();
  
  if (!accessToken || !expiresAt || now > Number(expiresAt) - 5 * 60 * 1000) {
    const refresh = await fetch(new URL('/api/auth/refresh', req.url), {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    });

    if (!refresh.ok) {
      // For programmatic API calls, return JSON 401 so clients don't get HTML login pages.
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      // For browser page navigation, redirect to login as before.
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
  matcher: [
    '/api/spotify/:path*',
    '/api/auth/token',
    '/player/:path*',
  ],
};
