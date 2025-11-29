'use client';
import { useEffect, useRef, useCallback } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { useAuth } from '@/modules/auth/';
import { useSpotifyAuthToken, useSpotifyPlayerCallback, PlayerErrorBoundary } from '@/modules/player';

export default function SpotifyWebPlayer() {
  const { isChecking: isAuthChecking, isAuthenticated } = useAuth();
  const { token, authError, handleToken, setAuthError, setToken } = useSpotifyAuthToken();
  const handleCallback = useSpotifyPlayerCallback(handleToken);
  const hasInitialized = useRef(false);
  const playerKey = useRef(0);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (
      isAuthenticated &&
      !token &&
      !authError &&
      !hasInitialized.current &&
      !fetchingRef.current
    ) {
      fetchingRef.current = true;
      hasInitialized.current = true;
      handleToken().finally(() => {
        fetchingRef.current = false;
      });
    }
  }, [isAuthenticated, token, authError, handleToken]);

  const retryPlayer = useCallback(async () => {
    setAuthError(null);
    hasInitialized.current = false;
    playerKey.current += 1;
    try {
      const newToken = await handleToken();
      if (!newToken) {
        setToken(null);
      }
    } catch {
      setToken(null);
    }
  }, [handleToken, setAuthError, setToken]);

  if (isAuthChecking || !isAuthenticated) return null;

  if (!token) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        {authError || 'Loading player...'}
      </div>
    );
  }

  const keySafePart = token ? token.slice(0, 10) : 'pending';
  const playerKeyString = `player-${playerKey.current}-${keySafePart}`;

  return (
    <PlayerErrorBoundary onRetry={retryPlayer}>
      <SpotifyPlayer
        key={playerKeyString}
        token={token}
        name="DECODED Web Player"
        callback={handleCallback}
        // @ts-ignore - runtime prop accepted by SDK
        getOAuthToken={(cb: (t: string) => void) => {
          // Return cached token immediately if available, refresh in background
          if (token) {
            cb(token);
            // Refresh in background to ensure token stays fresh
            handleToken().catch(() => {});
          } else {
            handleToken()
              .then((t) => {
                if (t) cb(t);
                else setAuthError('Token unavailable – please log in again');
              })
              .catch((err) => {
                console.error('SDK token refresh failed:', err);
                setAuthError('Token refresh failed – please log in again');
              });
          }
        }}
        syncExternalDeviceInterval={2}
        persistDeviceSelection={true}
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