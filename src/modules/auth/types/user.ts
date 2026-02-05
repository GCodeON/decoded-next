export interface User {
  id: string;
  display_name: string;
  email?: string;
  emailVerified?: boolean;
  authProvider?: 'spotify' | 'email';
  spotifyProduct?: 'premium' | 'free' | string;
  role?: 'admin' | 'user';
  images?: { url: string }[];
  createdAt?: number;
  lastLoginAt?: number;
}

export interface AuthState {
  authenticated: boolean;
  user: User | null;
  loading: boolean;
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};