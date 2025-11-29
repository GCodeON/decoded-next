import { useRef, useEffect, useCallback } from 'react';

interface PollConfig {
  enabled: boolean;
  baseMs: number;
  maxMs?: number;
  onAuthError?: () => void;
}

const isNetworkError = (err: any): boolean => {
  const code = err?.code || '';
  const message = err?.message || '';
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNRESET') ||
    message.includes('network')
  );
};

export function useSafePolling(
  pollFn: () => Promise<void>,
  { enabled, baseMs, maxMs = baseMs * 10, onAuthError }: PollConfig
) {
  const pollStateRef = useRef({
    active: true,
    baseMs,
    backoffMs: baseMs,
    maxMs,
    consecutiveErrors: 0,
    timeoutId: null as NodeJS.Timeout | null
  });

  const safePoll = useCallback(async () => {
    if (!pollStateRef.current.active) return;

    try {
      await pollFn();

      // Reset backoff on success
      pollStateRef.current.consecutiveErrors = 0;
      pollStateRef.current.backoffMs = pollStateRef.current.baseMs;
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      const message = err?.message || '';

      // 401: pause polling briefly to allow token refresh
      if (
        status === 401 ||
        message.includes('Token refresh failed') ||
        message.includes('log in again') ||
        message.includes('unauthorized')
      ) {
        pollStateRef.current.active = false;
        onAuthError?.();

        // Resume after 5 seconds
        setTimeout(() => {
          pollStateRef.current.active = true;
          pollStateRef.current.backoffMs = pollStateRef.current.baseMs;
          pollStateRef.current.consecutiveErrors = 0;
        }, 5000);
      } else {
        // Network errors: lighter backoff with jitter
        const isNetwork = isNetworkError(err);
        pollStateRef.current.consecutiveErrors += 1;
        
        const multiplier = isNetwork ? 1.5 : 2; // Gentler for network issues
        const next = Math.min(
          pollStateRef.current.baseMs * Math.pow(multiplier, pollStateRef.current.consecutiveErrors),
          pollStateRef.current.maxMs
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.floor(Math.random() * 500);
        pollStateRef.current.backoffMs = next + jitter;
      }
    }
  }, [pollFn, onAuthError]);

  useEffect(() => {
    if (!enabled) {
      pollStateRef.current.active = false;
      if (pollStateRef.current.timeoutId) {
        clearTimeout(pollStateRef.current.timeoutId);
        pollStateRef.current.timeoutId = null;
      }
      return;
    }

    pollStateRef.current.active = true;
    pollStateRef.current.backoffMs = pollStateRef.current.baseMs;
    pollStateRef.current.consecutiveErrors = 0;
    let cancelled = false;

    const loop = async () => {
      await safePoll();
      if (cancelled || !pollStateRef.current.active) return;

      const delay = pollStateRef.current.backoffMs;
      pollStateRef.current.timeoutId = setTimeout(loop, delay);
    };

    loop();

    return () => {
      cancelled = true;
      pollStateRef.current.active = false;
      if (pollStateRef.current.timeoutId) {
        clearTimeout(pollStateRef.current.timeoutId);
        pollStateRef.current.timeoutId = null;
      }
    };
  }, [enabled, safePoll]);

  return pollStateRef;
}
