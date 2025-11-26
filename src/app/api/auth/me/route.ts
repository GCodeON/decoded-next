import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const user = await res.json();
      return NextResponse.json({ authenticated: true, user });
    }
  } catch (err) {
    // ignore
  }

  return NextResponse.json({ authenticated: false }, { status: 200 });
}