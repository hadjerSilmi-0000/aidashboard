"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { authApi } from "@/lib/api";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "admin" | "manager";
  status: string;
  emailVerified: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  emailNotVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  // Keep a ref to last known user so 403 doesn't wipe them out
  const lastKnownUser = useRef<User | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getProfile();
      const u = res.data.user as User;
      setUser(u);
      lastKnownUser.current = u;
      setEmailNotVerified(false);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        // Email not verified — keep the last known user so Shell doesn't redirect
        // If we have a stored user from login, keep it
        if (lastKnownUser.current) {
          setUser(lastKnownUser.current);
        }
        setEmailNotVerified(true);
      } else {
        // 401 / network error → clear session
        setUser(null);
        lastKnownUser.current = null;
        setEmailNotVerified(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    // Store user from login response immediately so 403 on refreshUser won't lose it
    if (res.data.user) {
      const u = res.data.user as User;
      setUser(u);
      lastKnownUser.current = u;
    }
    // Try to get full profile; on 403 we still have the user from login
    await refreshUser();
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    if (typeof window !== "undefined") localStorage.removeItem("accessToken");
    setUser(null);
    lastKnownUser.current = null;
    setEmailNotVerified(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, emailNotVerified, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
