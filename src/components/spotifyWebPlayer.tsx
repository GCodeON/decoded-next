'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from '@/context/spotifyPlayerContext';
import { useAuth } from '@/hooks/useAuth';
import SpotifyPlayer from 'react-spotify-web-playback';
import PlayerErrorBoundary from '@/components/playerErrorBoundary';

export default function SpotifyWebPlayer() {
  const [token, setToken] = useState<string | null>(null);
  const { setDeviceId } = useSpotifyPlayer();

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/token', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('No token');
      }
      const data = await res.json();
      setToken(data.token);
      return data.token;
    } catch (err) {
      console.error('Failed to get Spotify token:', err);
      return null;
    }
  }, []);

  const handleToken = useCallback(async (): Promise<string | null> => {
    try {
      const getRes = await fetch('/api/auth/token', { credentials: 'include' });
      if (getRes.ok) {
        const data = await getRes.json();
        setToken(data.token);
        return data.token;
      }

      if (getRes.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!refreshRes.ok) {
          console.warn('Refresh failed when called from player getOAuthToken');
          return null;
        }

        const retry = await fetch('/api/auth/token', { credentials: 'include' });
        if (!retry.ok) return null;
        const data = await retry.json();
        setToken(data.token);
        return data.token;
      }

      return null;
    } catch (e) {
      console.error('Error obtaining token for Spotify SDK:', e);
      return null;
    }
  }, []);

  const { isChecking: isAuthChecking, isAuthenticated, checkAuth } = useAuth();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const ok = await checkAuth();
      if (!mounted) return;
      if (!ok) return;
      await fetchToken();
    };
    init();

    return () => {
      mounted = false;
    };
  }, [checkAuth, fetchToken]);


  const handleCallback = (state: any) => {
    if (state?.status === 'READY') {
      try {
        const deviceId = state?.device_id || state?.deviceId || null;
        if (deviceId) setDeviceId(deviceId);
      } catch (e) {
        console.log('Spotify Player callback error:', e);
      }
    }
  };

  if (isAuthChecking || !isAuthenticated) return null;

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