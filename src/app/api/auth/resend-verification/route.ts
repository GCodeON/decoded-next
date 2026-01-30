import { NextRequest, NextResponse } from 'next/server';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return NextResponse.json(
        { error: 'No user is currently signed in' },
        { status: 401 }
      );
    }

    if (currentUser.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    // Send verification email
    await sendEmailVerification(currentUser, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('Resend verification error:', error);

    if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    );
  }
}
