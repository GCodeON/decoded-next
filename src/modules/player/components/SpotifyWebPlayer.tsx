'use client';

import { useEffect, useRef } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { useAuth } from '@/modules/auth/';
import { useSpotifyAuthToken, useSpotifyPlayerCallback, PlayerErrorBoundary } from '@/modules/player';

export default function SpotifyWebPlayer() {
  const { isChecking: isAuthChecking, isAuthenticated } = useAuth();
  const { token, authError, handleToken, setAuthError, setToken } = useSpotifyAuthToken();
  const handleCallback = useSpotifyPlayerCallback(handleToken);
  const hasInitialized = useRef(false);
  const playerKey = useRef(0);

  useEffect(() => {
    if (isAuthenticated && !token && !authError && !hasInitialized.current) {
      hasInitialized.current = true;
      handleToken();
    }
  }, [isAuthenticated, token, authError, handleToken]);

  // Temporary: Simulate player error for testing error boundary

  if (isAuthChecking || !isAuthenticated) return null;

  if (!token) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        {authError || 'Loading player...'}
      </div>
    );
  }

  return (
    <PlayerErrorBoundary onRetry={() => {
      setAuthError(null);
      setToken(null);
      hasInitialized.current = false;
      playerKey.current += 1;
      handleToken();
    }}>
      <SpotifyPlayer
        key={`player-${playerKey.current}-${token?.substring(0, 10)}`}
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
        showSaveIcon={true}
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