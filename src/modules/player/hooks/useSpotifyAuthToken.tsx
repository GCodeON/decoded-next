'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuthApi } from '@/modules/auth/';

export const useSpotifyAuthToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshLockRef = useRef<Promise<string | null> | null>(null);

  const { getToken, refresh } = useAuthApi();

  const handleToken = useCallback(async (): Promise<string | null> => {
    // If already refreshing, return existing promise
    if (refreshLockRef.current) {
      return refreshLockRef.current;
    }

    // If we have a token, return it immediately
    if (token) {
      return token;
    }

    // Otherwise, fetch/refresh token with lock
    const refreshPromise = (async () => {
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

        setToken(null);
        setAuthError('Network error while obtaining token.');
        return null;
      } finally {
        refreshLockRef.current = null;
      }
    })();

    refreshLockRef.current = refreshPromise;
    return refreshPromise;
  }, [getToken, refresh, token]);

  return { token, authError, handleToken, setAuthError, setToken };
};
