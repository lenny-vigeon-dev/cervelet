"use client";

import { useEffect, useState } from "react";
import { sessionStorage } from "@/lib/session-storage";
import { signInWithDiscord, signOut as firebaseSignOut } from "@/lib/firebase/auth";
import type { SessionState } from "@/types/session";

/**
 * Client-side hook for managing user session state.
 * Syncs with localStorage and provides methods for login/logout.
 *
 * Also handles Firebase Authentication after Discord OAuth.
 */
export function useSession() {
  const [session, setSession] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      // Load Discord session from localStorage
      const storedSession = sessionStorage.getSession();
      setSession(storedSession);

      // If user is authenticated with Discord, also authenticate with Firebase
      if (storedSession.isAuthenticated) {
        console.log('🔐 Discord session found, authenticating with Firebase...');
        await signInWithDiscord(storedSession.user);
      }

      setIsLoading(false);
    }

    initSession();

    // Listen for storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "discord_session") {
        const newSession = sessionStorage.getSession();
        setSession(newSession);

        // Also update Firebase auth
        if (newSession.isAuthenticated) {
          signInWithDiscord(newSession.user);
        } else {
          firebaseSignOut();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const logout = async () => {
    // Logout from both Discord and Firebase
    sessionStorage.clearSession();
    await firebaseSignOut();
    setSession({ user: null, isAuthenticated: false });
  };

  return {
    session,
    isLoading,
    logout,
  };
}
