'use client'
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAccessToken } from '@/hooks/spotify';

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const code = searchParams.get('code');

  const [ access, setAccess] = useState(false);

  useEffect(() => {
    async function authenticate() {
      if (code) {
        const auth = await getAccessToken(code);
        console.log('callback', auth);
        localStorage.setItem('auth', JSON.stringify(auth));
        localStorage.setItem('access_token', auth.access_token);

        setAccess(true);
      }
    }

    authenticate();
  }, [code]);

  useEffect(() => {
    router.push('/');
  }, [router, access]);

  return <div>Authenticating...</div>;
}
