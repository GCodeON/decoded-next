import axios, { AxiosInstance } from 'axios';

// Factory that creates a configured Axios instance for Spotify Web API.
export const createSpotifyAxios = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: 'https://api.spotify.com/v1',
    headers: { 'Content-Type': 'application/json' },
  });

  // Attach access token from cookies (server-side only context)
  instance.interceptors.request.use(
    async (config) => {
      try {
        const { cookies } = await import('next/headers');
        const accessToken = cookies().get('spotify_access_token')?.value;
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } catch (_) {
        // In client-side execution this will fail; we silently ignore.
      }
      return config;
    },
    (err) => Promise.reject(err)
  );

  // Refresh token once on 401 then retry original request.
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalReq: any = error.config;
      if (error.response?.status === 401 && !originalReq._retry) {
        originalReq._retry = true;
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const refreshRes = await fetch(`${base}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!refreshRes.ok) {
          return Promise.reject(new Error('Token refresh failed – please log in again'));
        }
        try {
          const { cookies } = await import('next/headers');
          const newToken = cookies().get('spotify_access_token')?.value;
          if (newToken) {
            originalReq.headers = originalReq.headers || {};
            originalReq.headers.Authorization = `Bearer ${newToken}`;
          }
        } catch (_) {}
        return instance(originalReq);
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Convenience default export matching previous api-client usage.
export default function spotifyClient(): AxiosInstance {
  return createSpotifyAxios();
}
