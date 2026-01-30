"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import useAuth from '@/modules/auth/hooks/useAuth';

type Props = {
  children: React.ReactNode;
  requireRole?: 'admin' | 'user';
  requireEmailVerification?: boolean;
};

const PUBLIC_PATHS = ['/', '/login', '/register', '/api/auth/callback', '/callback'];

export default function AuthGuard({ children, requireRole, requireEmailVerification = true }: Props) {
  const pathname = usePathname();
  const { isChecking, isAuthenticated, user, checkAuth } = useAuth();

  useEffect(() => {
    if (PUBLIC_PATHS.some((p) => pathname?.startsWith(p))) return;
    checkAuth();
  }, [pathname, checkAuth]);

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname?.startsWith(p))) {
    return <>{children}</>;
  }

  // Still checking auth
  if (isChecking) return null;

  // Not authenticated
  if (!isAuthenticated) return null;

  // Check email verification for email auth users
  if (requireEmailVerification && user?.authProvider === 'email' && !user?.emailVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Email Verification Required</h2>
          <p className="text-gray-300 mb-6">
            Please verify your email address to access this page. Check your inbox for a verification link.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requireRole && user?.role !== requireRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-6">
            You do not have permission to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
