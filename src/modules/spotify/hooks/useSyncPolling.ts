'use client'
import { useRef, useEffect, useCallback } from 'react';

interface SyncPollConfig {
  enabled: boolean;
  intervalMs?: number;
}

/**
 * High-frequency polling every 200-500ms for precise position tracking.
 */
export function useSyncPolling(
  pollFn: () => Promise<void>,
  { enabled, intervalMs = 250 }: SyncPollConfig
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
