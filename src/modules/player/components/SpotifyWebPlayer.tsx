'use client';
import { useEffect, useRef, useCallback } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { useAuth } from '@/modules/auth/';
import { useSpotifyAuthToken, useSpotifyPlayerCallback, PlayerErrorBoundary } from '@/modules/player';

export default function SpotifyWebPlayer() {
  const { isChecking: isAuthChecking, isAuthenticated, login } = useAuth();
  const { token, authError, handleToken, setAuthError, setToken } = useSpotifyAuthToken();
  const handleCallback = useSpotifyPlayerCallback(handleToken);
  const hasInitialized = useRef(false);
  const playerKey = useRef(0);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (isAuthChecking) return;
    if (!isAuthenticated) {
      setToken(null);
      setAuthError(null);
      hasInitialized.current = false;
      playerKey.current += 1;
    }
  }, [isAuthenticated, isAuthChecking, setToken, setAuthError]);

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

  const handleSpotifyLogin = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('post_login_redirect', window.location.pathname + window.location.search);
      } catch {
        // Ignore storage errors
      }
    }
    login();
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center w-full bg-black p-2">
        <button
          type="button"
          onClick={handleSpotifyLogin}
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer"
          aria-label="Continue with Spotify"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.5c-1.5 0-1.8-.9-5.5-.9-3.5 0-4 .9-5.5.9-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3 .6 0 1.3.1 2 .3.7.2 1.5.4 2.5.4 1 0 1.8-.2 2.5-.4.7-.2 1.3-.3 2-.3 1.6 0 3 1.3 3 3 0 1.7-1.3 3-3 3zm0-6c-1.5 0-1.8-.9-5.5-.9-3.5 0-4 .9-5.5.9-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3 .6 0 1.3.1 2 .3.7.2 1.5.4 2.5.4 1 0 1.8-.2 2.5-.4.7-.2 1.3-.3 2-.3 1.6 0 3 1.3 3 3 0 1.7-1.3 3-3 3z" />
          </svg>
          {isAuthChecking ? 'Checking Spotify login…' : authError || 'Connect Spotify'}
        </button>
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
        syncExternalDeviceInterval={1}
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