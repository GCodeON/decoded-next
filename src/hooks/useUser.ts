'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  display_name: string;
  images?: { url: string }[];
}

interface AuthState {
  authenticated: boolean;
  user: User | null;
  loading: boolean;
}

export const useUser = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();

        setState({
          authenticated: data.authenticated,
          user: data.user || null,
          loading: false,
        });
      } catch (err) {
        setState({ authenticated: false, user: null, loading: false });
      }
    };

    checkAuth();
  }, []);

  return state;
};