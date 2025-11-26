'use client';

import { useCallback } from 'react';
import { useSpotifyPlayer } from '@/modules/player';

export const useSpotifyPlayerCallback = (handleToken: () => Promise<string | null>) => {
  const { setDeviceId } = useSpotifyPlayer();

  const handleCallback = useCallback((state: any) => {
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
  }, [setDeviceId, handleToken]);

  return handleCallback;
};
