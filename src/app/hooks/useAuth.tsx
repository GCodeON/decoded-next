import { useRouter } from 'next/router';
import axios from 'axios';

export const useAuth = () => {
  const router = useRouter();

  const login = () => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = `${process.env.BASE_URL}/api/callback`;

    // const scope = 'user-library-read'; // Adjust the scope as needed

    const scopes = [
        "streaming",
        "user-read-currently-playing",
        "user-read-recently-played",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-playback-position",
        "user-top-read",
        "user-read-private",
        "user-read-birthdate"
    ];


    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=code`;

    window.location.href = authUrl;
  };

  const logout = () => {
    // Implement logout logic if needed
  };

  return { login, logout };
};
