'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthState } from '@/modules/auth/';

type UseUserReturn = AuthState & {
  refetch: () => Promise<void>;
};

export const useUser = (): UseUserReturn => {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { 
        credentials: 'include',
        cache: 'no-store' // Prevent caching to always get fresh data
      });
      const data = await res.json();

      setState({
        authenticated: data.authenticated,
        user: data.user || null,
        loading: false,
      });
    } catch (err) {
      setState({ authenticated: false, user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for custom auth events
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, [checkAuth]);

  return { ...state, refetch: checkAuth };
};