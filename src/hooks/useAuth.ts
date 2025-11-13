'use client';

import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();

  const login = () => {
    const scopes = [
      'streaming',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-playback-position',
      'user-top-read',
      'user-library-read',
      'user-read-private',
      'user-read-email',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
      scope: scopes,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };

  const logout = async () => {
    document.cookie.split(';').forEach((c) => {
      const [name] = c.trim().split('=');
      if (name.startsWith('spotify_')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      }
    });

    router.push('/');
    router.refresh();
  };

  return { login, logout };
};