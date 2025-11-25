/**
 * Transport abstraction for Spotify API calls.
 * Allows services to be environment-agnostic (client vs server).
 */
export interface SpotifyTransport {
  /**
   * Execute an HTTP request to the Spotify API.
   * @param method HTTP method (GET, POST, PUT, DELETE)
   * @param path Spotify API path (e.g., '/tracks/123')
   * @param body Optional request body
   * @returns Promise resolving to the response data
   */
  request<T = any>(method: string, path: string, body?: unknown): Promise<T>;
}
