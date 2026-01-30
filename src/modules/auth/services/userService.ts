import { doc, getDoc, setDoc, collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface FirestoreUser {
  id: string;
  displayName: string;
  email?: string;
  emailVerified: boolean;
  authProvider: 'spotify' | 'email';
  role: 'admin' | 'user';
  spotifyId?: string;
  images?: Array<{ url: string }>;
  createdAt: number;
  lastLoginAt: number;
  spotifyProduct?: string;
}

/**
 * Check if this is the first user in the system
 * First user automatically gets admin role
 */
async function isFirstUser(): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getCountFromServer(usersRef);
    return snapshot.data().count === 0;
  } catch (error) {
    console.error('Error checking if first user:', error);
    return false;
  }
}

/**
 * Ensure a user exists in Firestore
 * Creates new user if doesn't exist, updates lastLoginAt if exists
 * First user gets admin role, subsequent users get user role
 */
export async function ensureUserExists(userData: {
  id: string;
  displayName: string;
  email?: string;
  emailVerified: boolean;
  authProvider: 'spotify' | 'email';
  spotifyId?: string;
  images?: Array<{ url: string }>;
  spotifyProduct?: string;
}): Promise<FirestoreUser> {
  try {
    const userRef = doc(db, 'users', userData.id);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Existing user - update last login
      const existingUser = userSnap.data() as FirestoreUser;
      await setDoc(userRef, {
        ...existingUser,
        lastLoginAt: Date.now(),
        // Update email verification if provided
        ...(userData.emailVerified !== undefined && { emailVerified: userData.emailVerified }),
      }, { merge: true });
      return existingUser;
    }

    // New user - check if first user for admin role
    const role = await isFirstUser() ? 'admin' : 'user';

    const newUser: FirestoreUser = {
      id: userData.id,
      displayName: userData.displayName,
      email: userData.email,
      emailVerified: userData.emailVerified,
      authProvider: userData.authProvider,
      role,
      spotifyId: userData.spotifyId,
      images: userData.images,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      spotifyProduct: userData.spotifyProduct,
    };

    await setDoc(userRef, newUser);
    console.log(`✅ Created new user: ${userData.displayName} (${role})`);
    return newUser;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    throw error;
  }
}

/**
 * Get user by ID from Firestore
 */
export async function getUserById(userId: string): Promise<FirestoreUser | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? (userSnap.data() as FirestoreUser) : null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Update user role
 * Admin only - should be called from protected API route
 */
export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { role }, { merge: true });
    console.log(`✅ Updated user ${userId} role to ${role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}
