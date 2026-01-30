import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ensureUserExists } from '@/modules/auth/services/userService';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Send verification email
    await sendEmailVerification(firebaseUser, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
    });

    // Create user record in Firestore
    const firestoreUser = await ensureUserExists({
      id: firebaseUser.uid,
      displayName,
      email: firebaseUser.email || email,
      emailVerified: false,
      authProvider: 'email',
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      userId: firestoreUser.id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password is too weak' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
