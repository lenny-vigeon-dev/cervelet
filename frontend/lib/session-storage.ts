import type { SessionState, UserProfile } from "@/types/session";

const SESSION_KEY = "discord_session";
const TOKEN_KEY = "discord_access_token";

/**
 * Client-side session storage utilities.
 * Manages session state in localStorage.
 */
export const sessionStorage = {
  /**
   * Gets the current session from localStorage
   */
  getSession(): SessionState {
    if (typeof window === "undefined") {
      return { isAuthenticated: false, user: null };
    }

    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) {
        return { isAuthenticated: false, user: null };
      }

      const user: UserProfile = JSON.parse(stored);
      return { isAuthenticated: true, user };
    } catch (error) {
      console.error("Failed to parse stored session", error);
      return { isAuthenticated: false, user: null };
    }
  },

  /**
   * Saves a session to localStorage
   */
  setSession(user: UserProfile): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  /**
   * Clears the session from localStorage
   */
  clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Gets the access token
   */
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Sets the access token
   */
  setAccessToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },
};
