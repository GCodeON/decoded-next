'use client';
import { usePlaybackState } from '@/modules/spotify/hooks/usePlaybackState';

/**
 * Ensures device tracking and playback state updates across all pages.
 */
export function PlaybackStateProvider() {
  usePlaybackState();
  return null;
}
