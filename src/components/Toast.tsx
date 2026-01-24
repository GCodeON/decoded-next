'use client';

import { useEffect, useState } from 'react';

export type ToastProps = {
  message: string | null;
  duration?: number;
  onDismiss?: () => void;
};

export function Toast({ message, duration = 3000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(!!message);

  useEffect(() => {
    if (!message) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!isVisible || !message) return null;

  return (
    <div className="fixed top-6 right-6 z-50 bg-black text-white px-4 py-2 rounded shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
      {message}
    </div>
  );
}
