"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '@/modules/auth/hooks/useAuth';
import { User } from '@/modules/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, login, loginWithEmail, error, setError } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isChecking) {
      router.replace('/');
    }
  }, [isAuthenticated, isChecking, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner message="Checking authentication..." size="small" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Email and password are required');
      return;
    }

    setIsLoading(true);
    const success = await loginWithEmail(formData.email, formData.password);

    if (success) {
      router.push('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-[75dvh] flex items-center justify-center px-4 py-12 bg-gradient-to-bl from-gray-900 to-black">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="text-white">DE<span className="text-green-500">CODED</span></span>
          </h1>
          <p className="text-gray-400">Login to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 space-y-6">
          {/* Email/Password Form */}
          {showEmailForm ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setFormData({ email: '', password: '' });
                  setError(null);
                }}
                className="w-full text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Back to options
              </button>
            </form>
          ) : (
            <>
              {/* Spotify Login */}
              <div>
                <button
                  onClick={login}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.5c-1.5 0-1.8-.9-5.5-.9-3.5 0-4 .9-5.5.9-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3 .6 0 1.3.1 2 .3.7.2 1.5.4 2.5.4 1 0 1.8-.2 2.5-.4.7-.2 1.3-.3 2-.3 1.6 0 3 1.3 3 3 0 1.7-1.3 3-3 3zm0-6c-1.5 0-1.8-.9-5.5-.9-3.5 0-4 .9-5.5.9-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3 .6 0 1.3.1 2 .3.7.2 1.5.4 2.5.4 1 0 1.8-.2 2.5-.4.7-.2 1.3-.3 2-.3 1.6 0 3 1.3 3 3 0 1.7-1.3 3-3 3z" />
                  </svg>
                  Continue with Spotify
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 border-t border-gray-600"></div>
                <span className="text-gray-400 text-sm">or</span>
                <div className="flex-1 border-t border-gray-600"></div>
              </div>

              {/* Email Login Button */}
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer"
              >
                Login with Email
              </button>
            </>
          )}

          {/* Signup Link */}
          <p className="text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}