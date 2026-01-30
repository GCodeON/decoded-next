"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/modules/auth/types/user';

export const useAuth = () => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    try {
      router.replace('/login');
    } catch (e) {}
  }, [router]);

  const checkAuth = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      
      if (!res.ok) {
        setIsAuthenticated(false);
        setUser(null);
        setIsChecking(false);
        return false;
      }

      const data = await res.json();
      
      if (data.authenticated && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
        setIsChecking(false);
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsChecking(false);
        return false;
      }
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      setIsChecking(false);
      return false;
    }
  }, []);

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

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return false;
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      return false;
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return false;
      }

      setUser(data.user);
      setIsAuthenticated(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    }
  }, []);

  const resendVerification = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend verification email');
        return false;
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear local state
    setIsAuthenticated(false);
    setUser(null);
    document.cookie.split(';').forEach((c) => {
      const [name] = c.trim().split('=');
      if (name.startsWith('spotify_') || name.startsWith('user_') || name.startsWith('firebase_')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      }
    });

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('auth-state-changed'));

    try {
      router.replace('/');
      router.refresh();
    } catch (e) {}
  }, [router]);

  return {
    login,
    loginWithEmail,
    register,
    resendVerification,
    logout,
    isChecking,
    isAuthenticated,
    user,
    checkAuth,
    redirectToLogin,
    error,
    setError,
  };
};

export default useAuth;