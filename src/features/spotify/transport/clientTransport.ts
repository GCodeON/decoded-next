import type { SpotifyTransport } from './SpotifyTransport';

/**
 * Client-side transport using fetch to proxy through Next.js API routes.
 * Handles token refresh via server-side interceptors.
 */
export const clientTransport: SpotifyTransport = {
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api/spotify${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    // Handle 204 No Content
    if (res.status === 204) {
      return null as T;
    }

    // Guard against HTML error pages
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Unexpected HTML response (status ${res.status}): ${text.slice(0, 200)}`
      );
    }

    // Parse error response
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    // Parse successful JSON response
    try {
      return await res.json();
    } catch (e: any) {
      throw new Error(
        `Failed to parse JSON response (status ${res.status}): ${e.message}`
      );
    }
  },
};
