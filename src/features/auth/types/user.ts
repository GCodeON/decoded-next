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