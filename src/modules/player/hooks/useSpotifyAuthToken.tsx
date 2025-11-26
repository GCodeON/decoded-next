'use client';

import { useState, useCallback } from 'react';
import { useAuthApi } from '@/modules/auth/';

export const useSpotifyAuthToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const { getToken, refresh } = useAuthApi();

  const handleToken = useCallback(async (): Promise<string | null> => {
    try {
      const t = await getToken();
      setToken(t);
      setAuthError(null);
      return t;
    } catch (err: any) {
      // If unauthorized, attempt a refresh flow
      if (err?.message === 'unauthorized') {
        try {
          await refresh();
          const t2 = await getToken();
          setToken(t2);
          setAuthError(null);
          return t2;
        } catch (rerr: any) {
          console.warn('Refresh failed when called from player getOAuthToken', rerr);
          if (rerr?.message === 'gateway') {
            setAuthError('Authentication gateway error. Try again later.');
          } else {
            setAuthError('Failed to refresh authentication. Please reload the page.');
          }
          setToken(null);
          return null;
        }
      }

      if (err?.message === 'gateway') {
        setAuthError('Authentication gateway error. Try again later.');
        setToken(null);
        return null;
      }

      console.error('Error obtaining token for Spotify SDK:', err);
      setToken(null);
      setAuthError('Network error while obtaining token.');
      return null;
    }
  }, [getToken, refresh]);

  return { token, authError, handleToken, setAuthError, setToken };
};
