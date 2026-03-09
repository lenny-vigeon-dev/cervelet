"use client";

import { useEffect, useState } from "react";
import { sessionStorage } from "@/lib/session-storage";
import {
  signOut as firebaseSignOut,
} from "@/lib/firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/config";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import type { SessionState } from "@/types/session";
import { COOLDOWN_STORAGE_KEY, COOLDOWN_EVENT } from "@/hooks/use-cooldown";

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
    async function initSession() {
      // Load Discord session from localStorage
      const storedSession = sessionStorage.getSession();
      setSession(storedSession);

      // Consume a pending Firebase custom token (stored by auth callback page)
      const pendingToken = localStorage.getItem("firebase_custom_token");
      if (pendingToken) {
        localStorage.removeItem("firebase_custom_token");
        try {
          const app = getFirebaseApp();
          const auth = getAuth(app);
          await signInWithCustomToken(auth, pendingToken);
        } catch (err) {
          console.warn("Firebase sign-in with stored token failed:", err);
        }
      }

      setIsLoading(false);
    }

    void initSession();

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

  const logout = async () => {
    // Sign out of Firebase Auth
    await firebaseSignOut();

    sessionStorage.clearSession();
    
    // Clear cooldown on logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(COOLDOWN_EVENT, { detail: null }));
    }

    setSession({ user: null, isAuthenticated: false });
  };

  return {
    session,
    isLoading,
    logout,
  };
}
