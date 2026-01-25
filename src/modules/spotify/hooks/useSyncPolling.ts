'use client'
import { useRef, useEffect, useCallback } from 'react';

interface SyncPollConfig {
  enabled: boolean;
  intervalMs?: number;
}

/**
 * High-frequency polling for precise position tracking.
 * Defaults to 1-2s intervals for rate-limited multi-tab scenarios.
 */
export function useSyncPolling(
  pollFn: () => Promise<void>,
  { enabled, intervalMs = 1000 }: SyncPollConfig
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRef = useRef(false);
  const isPollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (!activeRef.current || isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      await pollFn();
    } catch (err) {
      // Log errors to surface 429s and other rate limit issues
      if (err instanceof Error) {
        const isRateLimited = err.message.includes('429') || err.message.includes('Too Many');
        if (isRateLimited) {
          console.warn('[useSyncPolling] Rate limited - backing off:', err.message);
        } else {
          console.error('[useSyncPolling] Poll error:', err.message);
        }
      }
    } finally {
      isPollingRef.current = false;
    }

    if (activeRef.current) {
      timeoutRef.current = setTimeout(poll, intervalMs);
    }
  }, [pollFn, intervalMs]);

  useEffect(() => {
    if (!enabled) {
      activeRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    activeRef.current = true;
    poll();

    return () => {
      activeRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, poll]);
}
