'use client'
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Callback() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      window.location.href = `/api/auth/callback?code=${encodeURIComponent(code)}`;
    }
  }, [code]);

  return <div>Authenticating...</div>;
}