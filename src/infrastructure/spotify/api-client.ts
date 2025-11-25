import axios, { AxiosInstance } from 'axios';

const spotifyClient = (endpoint?: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: 'https://api.spotify.com/v1',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(
    async (config) => {
      const { cookies } = await import('next/headers');

      const accessToken = cookies().get('spotify_access_token')?.value;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (err) => Promise.reject(err)
  );

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalReq = error.config;

      if (error.response?.status === 401 && !originalReq._retry) {
        originalReq._retry = true;

        const refreshRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/refresh`,
          { method: 'POST', credentials: 'include' }
        );

        if (!refreshRes.ok) {
          return Promise.reject(new Error('Token refresh failed – please log in again'));
        }

        const { cookies } = await import('next/headers');
        const newToken = cookies().get('spotify_access_token')?.value;
        if (newToken) {
          originalReq.headers.Authorization = `Bearer ${newToken}`;
        }

        return instance(originalReq);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export default spotifyClient;