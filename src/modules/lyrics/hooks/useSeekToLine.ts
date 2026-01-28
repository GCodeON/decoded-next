'use client';
import { useCallback, useRef } from 'react';

interface UseSeekToLineOptions {
  seekTo: (positionMs: number) => Promise<void>;
  onDisableAutoScroll: (disabled: boolean) => void;
  leadAdjustmentMs?: number;
  reEnableDelayMs?: number;
}

export function useSeekToLine({
  seekTo,
  onDisableAutoScroll,
  leadAdjustmentMs = 150,
  reEnableDelayMs = 3000,
}: UseSeekToLineOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSeekToLine = useCallback(async (timeMs: number) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Disable auto scroll when user manually seeks
    onDisableAutoScroll(true);
    
    // Adjust time backwards by lead constant to account for word sync lead
    const adjustedTimeMs = Math.max(0, timeMs - leadAdjustmentMs);
    
    try {
      await seekTo(adjustedTimeMs);
    } catch (err) {
      console.error('Seek to line failed:', err);
    }
    
    // Re-enable auto scroll after delay
    timeoutRef.current = setTimeout(() => {
      onDisableAutoScroll(false);
    }, reEnableDelayMs);
  }, [seekTo, onDisableAutoScroll, leadAdjustmentMs, reEnableDelayMs]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    handleSeekToLine,
    cleanup,
  };
}
