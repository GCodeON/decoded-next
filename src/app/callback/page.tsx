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
        const accessToken = await getAccessToken(code);
        console.log('callback', accessToken);
        // localStorage.setItem('accessToken', accessToken);
        // router.push('/');
      }
    }

    authenticate();
  }, [router, code]);

  return <div>Authenticating...</div>;
}
