// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function attemptRefresh(refreshToken: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // For 5xx errors, retry with exponential backoff
      if (response.status >= 500 && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.warn(`Spotify refresh attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (err) {
      // Network error - retry if attempts remaining
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.warn(`Spotify refresh network error on attempt ${attempt + 1}, retrying in ${delay}ms:`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('All refresh attempts failed');
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const response = await attemptRefresh(refreshToken);

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