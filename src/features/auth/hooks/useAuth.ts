"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const redirectToLogin = useCallback(() => {
    try {
      router.replace('/login');
    } catch (e) {
      // noop
    }
  }, [router]);

  const checkAuth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/auth/token', { credentials: 'include' });
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/html')) {
        setIsAuthenticated(false);
        setIsChecking(false);
        redirectToLogin();
        return false;
      }

      if (!res.ok) {
        setIsAuthenticated(false);
        setIsChecking(false);
        redirectToLogin();
        return false;
      }

      setIsAuthenticated(true);
      setIsChecking(false);
      return true;

    } catch (err) {

      setIsAuthenticated(false);
      setIsChecking(false);
      redirectToLogin();
      return false;
      
    }
  }, [redirectToLogin]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(() => {
    const scopes = [
      'streaming',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-playback-position',
      'user-top-read',
      'user-library-read',
      'user-read-private',
      'user-read-email',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
      scope: scopes,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  }, []);

  const logout = useCallback(async () => {
    // Clear spotify-related cookies
    document.cookie.split(';').forEach((c) => {
      const [name] = c.trim().split('=');
      if (name.startsWith('spotify_')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      }
    });

    try {
      router.replace('/');
      router.refresh();
    } catch (e) {
      // noop
    }
  }, [router]);

  return { login, logout, isChecking, isAuthenticated, checkAuth, redirectToLogin };
};

export default useAuth;