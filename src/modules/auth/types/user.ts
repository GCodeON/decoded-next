export interface User {
  id: string;
  display_name: string;
  images?: { url: string }[];
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