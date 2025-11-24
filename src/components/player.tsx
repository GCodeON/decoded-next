 'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSpotifyPlayer } from '@/context/SpotifyPlayerContext';
import { useAuth } from '@/hooks/useAuth';
import SpotifyPlayer from 'react-spotify-web-playback';

export default function Player() {
  const [token, setToken] = useState<string | null>(null);
  const { setDeviceId } = useSpotifyPlayer();
  const router = useRouter();

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
  }, [router]);

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
    <>
      <SpotifyPlayer
        token={token}
        name="DECODED Web Player"
        callback={handleCallback}
        getOAuthToken={(cb: (token: string) => void) => {
          fetchToken()
            .then((t) => {
              if (t) cb(t);
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
    </>
  );
}