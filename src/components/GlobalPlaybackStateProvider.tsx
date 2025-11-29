'use client';
import { useGlobalPlaybackState } from '@/modules/spotify/hooks/useGlobalPlaybackState';

/**
 * Provider component that mounts global playback polling in the layout.
 * Ensures device tracking and playback state updates across all pages.
 */
export function GlobalPlaybackStateProvider() {
  useGlobalPlaybackState();
  return null;
}
