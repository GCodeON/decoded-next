import { useRouter } from 'next/router';
import axios from 'axios';

export const useAuth = () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  const login = () => {
    const AuthEndPoint = 'https://accounts.spotify.com/authorize';
    const redirectUri  = 'http://localhost:3000/callback/';

    const scopes = [
      "streaming",
      "user-read-currently-playing",
      "user-read-recently-played",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-playback-position",
      "user-top-read",
      "user-library-read"
    ];


    const authUrl = `${AuthEndPoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`;

    window.location.href = authUrl;
  };

  const logout = () => {
    // Implement logout logic if needed
  };

  return { login, logout };
};