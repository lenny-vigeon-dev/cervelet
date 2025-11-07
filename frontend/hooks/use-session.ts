"use client";

import { useEffect, useState } from "react";
import { sessionStorage } from "@/lib/session-storage";
import type { SessionState } from "@/types/session";

/**
 * Client-side hook for managing user session state.
 * Syncs with localStorage and provides methods for login/logout.
 */
export function useSession() {
  const [session, setSession] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load session from localStorage on mount
    const storedSession = sessionStorage.getSession();
    setSession(storedSession);
    setIsLoading(false);

    // Listen for storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "discord_session") {
        const newSession = sessionStorage.getSession();
        setSession(newSession);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const logout = () => {
    sessionStorage.clearSession();
    setSession({ user: null, isAuthenticated: false });
  };

  return {
    session,
    isLoading,
    logout,
  };
}
