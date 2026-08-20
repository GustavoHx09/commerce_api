'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
}

interface AuthContextData {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = api
      .post('/auth/refresh')
      .then((response) => response.data.data.accessToken)
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    return refreshPromise;
  }, []);

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          try {
            const newToken = await refreshAccessToken();
            setAccessToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch {
            setAccessToken(null);
            setUser(null);
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await api.post('/auth/refresh');
        const { accessToken: token, user: refreshedUser } = response.data.data;
        setAccessToken(token);
        setUser(refreshedUser);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken: token, user: loggedUser } = response.data.data;
    setAccessToken(token);
    setUser(loggedUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
