import { createContext, useContext } from 'react';
import type { User } from '../types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  isAuthenticated: false,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
