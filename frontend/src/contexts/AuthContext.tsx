'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window !== 'undefined') {
      // 从 localStorage 读取 token
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        setToken(savedToken);
      }
    }
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', newToken);
    }
  };

  const logout = () => {
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  };

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  // 只在服务端静态生成期间返回回退值，避免调用useContext
  // 客户端环境下正常使用 Context，即使是在静态导出模式下
  if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
    return {
      token: null,
      isAuthenticated: false,
      login: () => {},
      logout: () => {}
    };
  }

  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}