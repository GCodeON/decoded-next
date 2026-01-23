'use client'
import { useCallback } from 'react';
import { useSpotifyApi } from './useSpotifyApi';
import { selectTargetDevice } from '../utils/deviceSelection';

export interface PlaybackToggleOptions {
  deviceId?: string | null;
  lastExternalDevice?: string | null;
  onPlayStart?: () => void | Promise<void>;
  onPauseStart?: () => void | Promise<void>;
  onSuccess?: (state: any) => void;
  onError?: (error: Error) => void;
}

export function usePlaybackToggle(
  trackId: string,
  isPlaying: boolean,
  getPositionMs: () => number,
  options: PlaybackToggleOptions = {}
) {
  const spotify = useSpotifyApi();
  const {
    deviceId,
    lastExternalDevice,
    onPlayStart,
    onPauseStart,
    onSuccess,
    onError,
  } = options;

  const togglePlayback = useCallback(async () => {
    try {
  
      const devicesRes: any = await spotify.getDevices();
      const devices: any[] = devicesRes?.devices || [];

      const targetDeviceId = selectTargetDevice(
        devices,
        lastExternalDevice,
        deviceId
      );

      try {
        if (isPlaying) {
   
          if (onPauseStart) {
            await onPauseStart();
          }
          await spotify.pause(targetDeviceId);
        } else {
   
          const positionMs = getPositionMs();

          if (onPlayStart) {
            await onPlayStart();
          }

          await spotify.play(
            targetDeviceId || undefined,
            [`spotify:track:${trackId}`],
            positionMs
          );

       
          try {
            const state = await spotify.getPlaybackState();
            if (onSuccess) {
              onSuccess(state);
            }
          } catch {
   
          }
        }
      } catch (err: any) {
 
        const msg = String(err?.message || '');
        if (
          err?.response?.status === 404 ||
          msg.includes('device') ||
          msg.includes('404')
        ) {
          if (targetDeviceId) {

            await spotify.transferPlayback(targetDeviceId, true);

            if (!isPlaying) {
              const positionMs = getPositionMs();
              await spotify.play(
                targetDeviceId,
                [`spotify:track:${trackId}`],
                positionMs
              );

              try {
                const state = await spotify.getPlaybackState();
                if (onSuccess) {
                  onSuccess(state);
                }
              } catch {
              }
            }
          }
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [
    spotify,
    trackId,
    isPlaying,
    getPositionMs,
    deviceId,
    lastExternalDevice,
    onPlayStart,
    onPauseStart,
    onSuccess,
    onError,
  ]);

  return { togglePlayback };
}