import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/modules/auth/services/userService';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const spotifyAccessToken = cookieStore.get('spotify_access_token')?.value;

  // Check if user has a session (either email/password or Spotify)
  if (!userId && !spotifyAccessToken) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  try {
    // If we have a user_id cookie, get user from Firestore
    if (userId) {
      const firestoreUser = await getUserById(userId);
      
      if (firestoreUser) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: firestoreUser.id,
            display_name: firestoreUser.displayName,
            email: firestoreUser.email,
            emailVerified: firestoreUser.emailVerified,
            authProvider: firestoreUser.authProvider,
            role: firestoreUser.role,
            images: firestoreUser.images,
            createdAt: firestoreUser.createdAt,
          },
        });
      }
    }

    // Fallback to Spotify user (for backward compatibility)
    if (spotifyAccessToken) {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${spotifyAccessToken}` },
      });

      if (res.ok) {
        const spotifyUser = await res.json();
        return NextResponse.json({
          authenticated: true,
          user: {
            id: spotifyUser.id,
            display_name: spotifyUser.display_name,
            email: spotifyUser.email,
            images: spotifyUser.images,
          },
        });
      }
    }
  } catch (err) {
    console.error('Error fetching user:', err);
  }

  return NextResponse.json({ authenticated: false }, { status: 200 });
}