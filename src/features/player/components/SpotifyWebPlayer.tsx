'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSpotifyAuthToken } from '@/features/player/hooks/useSpotifyAuthToken';
import { useSpotifyPlayerCallback } from '@/features/player/hooks/useSpotifyPlayerCallback';
import SpotifyPlayer from 'react-spotify-web-playback';
import PlayerErrorBoundary from '@/features/player/components/PlayerErrorBoundary';

export default function SpotifyWebPlayer() {
  const { isChecking: isAuthChecking, isAuthenticated } = useAuth();
  const { token, authError, handleToken, setAuthError } = useSpotifyAuthToken();
  const handleCallback = useSpotifyPlayerCallback(handleToken);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !token && !authError && !hasInitialized.current) {
      hasInitialized.current = true;
      handleToken();
    }
  }, [isAuthenticated, token, authError, handleToken]);

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
      handleToken();
    }}>
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