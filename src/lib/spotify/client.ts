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
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('spotify_access_token')?.value;
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

  // Pass errors through; middleware handles proactive refresh.
  instance.interceptors.response.use(
    (res) => res,
    (error) => Promise.reject(error)
  );

  return instance;
};

// Convenience default export matching previous api-client usage.
export default function spotifyClient(): AxiosInstance {
  return createSpotifyAxios();
}
