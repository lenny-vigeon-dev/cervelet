export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  accentColor?: string;
  discriminator?: string;
}

/**
 * Session state with discriminated union for better type safety.
 * When isAuthenticated is true, user is guaranteed to be present.
 * When isAuthenticated is false, user is guaranteed to be null.
 */
export type SessionState =
  | { isAuthenticated: true; user: UserProfile }
  | { isAuthenticated: false; user: null };
