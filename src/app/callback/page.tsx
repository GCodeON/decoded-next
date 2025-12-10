'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If we're on 127.0.0.1, redirect to localhost first
    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      const newUrl = window.location.href.replace('127.0.0.1', 'localhost');
      window.location.href = newUrl;
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      router.push('/login?error=' + error);
      return;
    }

    if (code) {
      const callbackUrl = `/api/auth/callback?code=${code}&state=${state || ''}`;

      fetch(callbackUrl, { credentials: 'include' })
        .then(async res => {
          const data = await res.json();
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Authentication failed');
          }
          return data;
        })
        .then(() => {
          // Force full page reload to refresh all components with new auth state
          window.location.href = '/';
        })
        .catch(err => {
          console.error('Auth error:', err);
          router.push('/login?error=auth_failed');
        });
    }
  }, [searchParams, router]);

  return <div>Completing login...</div>;
}