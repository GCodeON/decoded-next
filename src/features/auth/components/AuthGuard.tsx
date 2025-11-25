"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import useAuth from '@/features/auth/hooks/useAuth';

type Props = {
  children: React.ReactNode;
};

const PUBLIC_PATHS = ['/login', '/api/auth/callback'];

export default function AuthGuard({ children }: Props) {
  const pathname = usePathname();
  const { isChecking, isAuthenticated, checkAuth } = useAuth();

  const publicPaths = PUBLIC_PATHS;

  useEffect(() => {
    // don't check public paths
    if (PUBLIC_PATHS.some((p) => pathname?.startsWith(p))) return;
    checkAuth();
  }, [pathname, checkAuth]);

  // If route is public, render children without guarding
  if (PUBLIC_PATHS.some((p) => pathname?.startsWith(p))) {
    return <>{children}</>;
  }

  if (isChecking) return null;

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
