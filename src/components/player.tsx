'use client';

import { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';

export default function Player() {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

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
    if (state.status === 'READY') {
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
        persistDeviceSelection={true}
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