/* eslint-disable react-refresh/only-export-components -- Context exports both provider and hook */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  bookmarks: string[];
  preferences: {
    language: 'de' | 'en';
    theme: 'dark' | 'light';
    regions: string[];
  };
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  addBookmark: (articleId: string) => Promise<void>;
  removeBookmark: (articleId: string) => Promise<void>;
  resendVerification: () => Promise<{ success: boolean; rateLimited?: boolean; minutesRemaining?: number }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'newshub-auth-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
        } else {
          // Token invalid, clear it
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      } catch {
        console.error('Failed to verify token');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem(TOKEN_KEY, data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem(TOKEN_KEY, data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<User['preferences']>) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/auth/preferences', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update preferences');
    }

    setUser((prev) => prev ? { ...prev, preferences: data.data } : null);
  }, [token]);

  const addBookmark = useCallback(async (articleId: string) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/auth/bookmarks/${articleId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add bookmark');
    }

    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        bookmarks: [...prev.bookmarks, articleId],
      };
    });
  }, [token]);

  const removeBookmark = useCallback(async (articleId: string) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/auth/bookmarks/${articleId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to remove bookmark');
    }

    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        bookmarks: prev.bookmarks.filter((id) => id !== articleId),
      };
    });
  }, [token]);

  const resendVerification = useCallback(async () => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.status === 429) {
      return {
        success: false,
        rateLimited: true,
        minutesRemaining: data.minutesRemaining,
      };
    }

    return { success: data.success };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isVerified: user?.emailVerified ?? false,
        login,
        register,
        logout,
        updatePreferences,
        addBookmark,
        removeBookmark,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
