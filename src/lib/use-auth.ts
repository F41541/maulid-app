"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CachedUserSession,
  getCachedUser,
  setCachedUser,
  clearCachedUser,
} from "./role-utils";

let inMemoryUser: CachedUserSession | null = null;
let isHydrated = false;

export function useAuth() {
  const [user, setUser] = useState<CachedUserSession | null>(() => {
    if (!isHydrated) return null;
    return inMemoryUser || getCachedUser();
  });
  const [loading, setLoading] = useState(!inMemoryUser);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          inMemoryUser = data.user;
          setCachedUser(data.user);
          setUser(data.user);
          return;
        }
      }
      inMemoryUser = null;
      clearCachedUser();
      setUser(null);
    } catch {
      // Ignore network errors on passive auth checks
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isHydrated = true;
    const cached = inMemoryUser || getCachedUser();
    if (cached) {
      inMemoryUser = cached;
      setUser(cached);
      setLoading(false);
    }
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    inMemoryUser = null;
    clearCachedUser();
    setUser(null);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}
  }, []);

  return { user, loading, refreshUser, logout };
}
