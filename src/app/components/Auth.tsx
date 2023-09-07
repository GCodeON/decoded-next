// components/Auth.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

export const Auth = () => {
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    login();
  }, []);

  return (
    <div>
      Redirecting to Spotify login...
    </div>
  );
};
