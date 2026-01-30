import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserById } from '@/modules/auth/services/userService';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Check email verification
    if (!firebaseUser.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in. Check your inbox for a verification link.' },
        { status: 403 }
      );
    }

    // Get user from Firestore
    const firestoreUser = await getUserById(firebaseUser.uid);

    if (!firestoreUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get Firebase ID token for session
    const idToken = await firebaseUser.getIdToken();

    const res = NextResponse.json({
      success: true,
      user: {
        id: firestoreUser.id,
        display_name: firestoreUser.displayName,
        email: firestoreUser.email,
        role: firestoreUser.role,
        emailVerified: firestoreUser.emailVerified,
        authProvider: firestoreUser.authProvider,
      },
    });

    // Set session cookies
    res.cookies.set('firebase_token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    res.cookies.set('user_id', firestoreUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set('user_role', firestoreUser.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Login error:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
