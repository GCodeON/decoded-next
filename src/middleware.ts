// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (!path.startsWith('/api/spotify') && !path.startsWith('/player')) {
    return NextResponse.next();
  }

  const expiresAt = req.cookies.get('spotify_expires_at')?.value;
  const now = Date.now();

  if (!expiresAt || now > Number(expiresAt) - 5 * 60 * 1000) {
    const refresh = await fetch(new URL('/api/auth/refresh', req.url), {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    });

    if (!refresh.ok) {
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