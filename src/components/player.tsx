 'use client';

import { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { useSpotifyPlayer } from '@/context/SpotifyPlayerContext';

export default function Player() {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { setDeviceId } = useSpotifyPlayer();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/auth/token', { credentials: 'include' });
        if (!res.ok) throw new Error('No token');
        const data = await res.json();
        setToken(data.token);
      } catch (err) {
        console.error('Failed to get Spotify token:', err);
      }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);


  const handleCallback = (state: any) => {
    if (state?.status === 'READY') {
      try {
        const deviceId = state?.device_id || state?.deviceId || null;
        if (deviceId) setDeviceId(deviceId);
      } catch (e) {
        console.log('Spotify Player callback error:', e);
      }
      setIsReady(true);
    }
  };

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