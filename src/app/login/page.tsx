"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/modules/auth';
import { useUser } from '@/modules/auth/hooks/useUser';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { authenticated, loading } = useUser();

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace('/');
    }
  }, [authenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner message="Checking authentication..." size="small" />
      </div>
    );
  }

  if (authenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-3xl text-white mb-8">Welcome to Decoded</h1>
        <div className="flex justify-center items-center">
          <User />
        </div>
      </div>
    </div>
  );
}