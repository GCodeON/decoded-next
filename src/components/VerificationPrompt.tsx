"use client";

import { useState } from 'react';
import useAuth from '@/modules/auth/hooks/useAuth';

export function VerificationPrompt() {
  const { user, resendVerification, error, setError } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!user || user.authProvider !== 'email' || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setError(null);
    setSuccessMessage('');
    setIsResending(true);

    const success = await resendVerification();
    if (success) {
      setSuccessMessage('Verification email sent! Check your inbox.');
    }

    setIsResending(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-900 border-l-4 border-yellow-600 p-4 rounded shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-200 mb-2">
              Email Verification Required
            </h3>
            <p className="text-sm text-yellow-100 mb-3">
              Please verify your email address to unlock all features. Check your inbox for a verification link.
            </p>
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white px-3 py-1 rounded transition-colors"
            >
              {isResending ? 'Resending...' : 'Resend Email'}
            </button>
            {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
            {successMessage && <p className="text-xs text-green-300 mt-2">{successMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationPrompt;
