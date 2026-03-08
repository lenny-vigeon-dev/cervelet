/**
 * Discord OAuth2 types and interfaces.
 */

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  accent_color?: number;
}

/**
 * Session user type. Matches UserProfile from @/types/session
 * with an additional discriminator field from Discord.
 */
export type { UserProfile as SessionUser } from "@/types/session";
