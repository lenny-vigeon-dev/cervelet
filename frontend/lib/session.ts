import { sessionStorage } from "@/lib/session-storage";
import type { SessionState } from "@/types/session";

/**
 * Fetches the current user session from localStorage.
 * This is used for server-side rendering to get the initial session state.
 * Returns an unauthenticated state if no session is found.
 *
 * Note: In SSR context, this will always return unauthenticated.
 * The actual session will be hydrated on the client side.
 *
 * @returns Promise resolving to the session state
 */
export async function fetchSession(): Promise<SessionState> {
  // In server context, we can't access localStorage
  // Return unauthenticated state - client will hydrate with actual session
  if (typeof window === "undefined") {
    return { user: null, isAuthenticated: false };
  }

  // In client context, get session from localStorage
  return sessionStorage.getSession();
}
