'use client';
import { useEffect, useState } from 'react';
import { usePlaybackState } from '@/modules/spotify/hooks/usePlaybackState';

/**
 * Ensures device tracking and playback state updates across all pages.
 * Only runs when user is authenticated.
 */
export function PlaybackStateProvider() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user has auth token before enabling playback state
    fetch('/api/auth/token', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  // Only start polling if authenticated
  const shouldPoll = isAuthenticated;
  usePlaybackState(shouldPoll);
  
  return null;
}
