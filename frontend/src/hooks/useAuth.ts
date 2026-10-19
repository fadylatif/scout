import { useState, useCallback } from 'react';
import type { User } from '../types';

export function useAuthState() {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('scout_user');
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('scout_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('scout_user');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  return {
    user,
    isAuthenticated: !!user,
    setUser,
    logout,
  };
}
