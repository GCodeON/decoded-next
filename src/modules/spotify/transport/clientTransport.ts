import type { SpotifyTransport } from './SpotifyTransport';

let rateLimitResetAt = 0;
let backoffMultiplier = 1;
const MAX_BACKOFF_MS = 30000;

async function handleRateLimit(retryAfterMs?: number) {
  const now = Date.now();
  const resetDelay = retryAfterMs || (backoffMultiplier * 1000);
  const delayMs = Math.min(resetDelay, MAX_BACKOFF_MS);

  rateLimitResetAt = now + delayMs;
  backoffMultiplier = Math.min(backoffMultiplier * 2, 30);

  console.warn(
    `[Spotify Client] Rate limited (429). Backoff for ${delayMs}ms. ` +
    `Next retry after: ${new Date(rateLimitResetAt).toISOString()}`
  );

  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function waitIfRateLimited() {
  const now = Date.now();
  if (rateLimitResetAt > now) {
    const delay = rateLimitResetAt - now;
    console.warn(`[Spotify Client] Still in backoff period. Waiting ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export const clientTransport: SpotifyTransport = {
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {

    await waitIfRateLimited();

    const res = await fetch(`/api/spotify${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (res.status === 204) {
      backoffMultiplier = 1;
      rateLimitResetAt = 0;
      return null as T;
    }

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('retry-after');
      const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader) * 1000 : undefined;
      await handleRateLimit(retryAfterMs);
      return this.request<T>(method, path, body);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Unexpected HTML response (status ${res.status}): ${text.slice(0, 200)}`
      );
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    backoffMultiplier = 1;
    rateLimitResetAt = 0;

    try {
      return await res.json();
    } catch (e: any) {
      throw new Error(
        `Failed to parse JSON response (status ${res.status}): ${e.message}`
      );
    }
  },
};
