'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from '@/features/player/context/SpotifyPlayerContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import SpotifyPlayer from 'react-spotify-web-playback';
import PlayerErrorBoundary from '@/features/player/components/PlayerErrorBoundary';

export default function SpotifyWebPlayer() {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const { setDeviceId } = useSpotifyPlayer();
  const { isChecking: isAuthChecking, isAuthenticated, checkAuth } = useAuth();

  const handleToken = useCallback(async (): Promise<string | null> => {
    try {
      const getRes = await fetch('/api/auth/token', { credentials: 'include' });
      if (getRes.ok) {
        const data = await getRes.json();
        setToken(data.token);
        setAuthError(null); // Clear any previous errors
        return data.token;
      }

      if (getRes.status === 401) {
        console.log('Token expired, attempting refresh...');
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!refreshRes.ok) {
          console.warn('Refresh failed when called from player getOAuthToken');
          setToken(null); // Clear token to trigger remount
          setAuthError('Failed to refresh authentication. Please reload the page.');
          return null;
        }

        const retry = await fetch('/api/auth/token', { credentials: 'include' });
        if (!retry.ok) {
          setToken(null);
          setAuthError('Failed to obtain new token after refresh.');
          return null;
        }
        const data = await retry.json();
        setToken(data.token);
        setAuthError(null);
        console.log('Token refreshed successfully');
        return data.token;
      }

      setToken(null);
      setAuthError(`Authentication failed with status ${getRes.status}`);
      return null;
    } catch (e) {
      console.error('Error obtaining token for Spotify SDK:', e);
      setToken(null);
      setAuthError('Network error while obtaining token.');
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const ok = await checkAuth();
      if (!mounted) return;
      if (!ok) return;
      await handleToken();
    };
    init();

    return () => {
      mounted = false;
    };
  }, [checkAuth, handleToken]);

  const handleCallback = (state: any) => {
    if (state?.status === 'READY') {
      try {
        const deviceId = state?.device_id || state?.deviceId || null;
        if (deviceId) setDeviceId(deviceId);
      } catch (e) {
        console.log('Spotify Player callback error:', e);
      }
    }

    // Handle authentication errors from the SDK
    if (state?.status === 'ERROR' && state?.error?.message?.includes('authentication')) {
      console.warn('Spotify SDK authentication error detected, attempting token refresh...');
      handleToken();
    }
  };

  if (isAuthChecking || !isAuthenticated) return null;

  if (authError) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400 text-sm mb-2">{authError}</p>
        <button
          onClick={() => {
            setAuthError(null);
            handleToken();
          }}
          className="text-blue-400 hover:text-blue-300 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        Loading player...
      </div>
    );
  }

  return (
    <PlayerErrorBoundary>
      <SpotifyPlayer
        key={token}
        token={token}
        name="DECODED Web Player"
        callback={handleCallback}
        // @ts-ignore - runtime prop accepted by SDK
        getOAuthToken={(cb: (token: string) => void) => {
          handleToken()
            .then((token) => {
              if (token) cb(token);
            })
            .catch((err) => {
              console.error('Failed to refresh token for Spotify SDK:', err);
            });
        }}
        syncExternalDeviceInterval={2}
        persistDeviceSelection={false}
        syncExternalDevice={true}
        styles={{
            activeColor       : '#fff',
            bgColor           : '#000',
            color             : '#fff',
            loaderColor       : '#fff',
            trackArtistColor  : '#ccc',
            trackNameColor    : '#fff',
            sliderHandleColor : '#fff'
        }}
      />
    </PlayerErrorBoundary>
  );
}