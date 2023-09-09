'use client'
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAccessToken } from '@/hooks/spotify';

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const code = searchParams.get('code');

  useEffect(() => {
    async function authenticate() {
      if (code) {
        const auth = await getAccessToken(code);
        console.log('callback', auth);
        localStorage.setItem('auth', JSON.stringify(auth));
        router.push('/');
      }
    }

    authenticate();
  }, [router, code]);

  return <div>Authenticating...</div>;
}
