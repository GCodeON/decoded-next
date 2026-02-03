import { useMemo } from 'react';
import { useUser } from './useUser';

/**
 * Hook to check if the current user has Spotify Premium
 * @returns boolean indicating if user has premium account
 */
export function useUserPremium(): boolean {
  const { user } = useUser();
  
  return useMemo(() => {
    return user?.spotifyProduct === 'premium';
  }, [user?.spotifyProduct]);
}

/**
 * Utility function to check if a user has premium
 * @param user User object or null
 * @returns boolean indicating if user has premium account
 */
export function isPremiumUser(user: { spotifyProduct?: string } | null): boolean {
  return user?.spotifyProduct === 'premium';
}
