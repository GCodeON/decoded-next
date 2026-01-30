import { NextRequest, NextResponse } from 'next/server';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    // Sign out from Firebase Auth if user is signed in
    if (auth.currentUser) {
      await signOut(auth);
    }

    const res = NextResponse.json({ success: true });

    // Clear all auth cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0, // Expire immediately
    };

    res.cookies.set('firebase_token', '', cookieOptions);
    res.cookies.set('user_id', '', cookieOptions);
    res.cookies.set('user_role', '', cookieOptions);
    res.cookies.set('spotify_access_token', '', cookieOptions);
    res.cookies.set('spotify_refresh_token', '', cookieOptions);
    res.cookies.set('spotify_expires_at', '', cookieOptions);

    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
