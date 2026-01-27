'use client';

import { useEffect } from 'react';
import { FaUser, FaPowerOff } from 'react-icons/fa';
import { useUser } from '@/modules/auth/hooks/useUser';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { usePathname } from 'next/navigation';

export default function User() {
  const { authenticated, user, loading, refetch } = useUser();
  const { login, logout } = useAuth();
  const pathname = usePathname();

  // Refetch user data when pathname changes (e.g., after login redirect)
  useEffect(() => {
    if (!loading) {
      refetch();
    }
  }, [pathname, refetch]);

  if (loading) {
    return (
      <div className="settings">
        <p className="text-xs text-gray-400"></p>
      </div>
    );
  }

  return (
    <div className="settings">
      {authenticated ? (
        <div
          className="logout flex items-center gap-2 cursor-pointer text-white hover:text-blue-400"
          onClick={logout}
        >
          <FaUser className="icon" />
          <span className="text-sm">{user?.display_name || 'User'}</span>
        </div>
      ) : (
        <div
          className="login flex items-center gap-2 cursor-pointer text-white hover:text-green-400"
          onClick={login}
        >
          <FaPowerOff className="icon" />
          <span className="text-sm"></span>
        </div>
      )}
    </div>
  );
}