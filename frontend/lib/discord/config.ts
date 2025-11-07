/**
 * Discord OAuth2 configuration and endpoints.
 */

export const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
export const DISCORD_USER_URL = "https://discord.com/api/users/@me";

export const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
export const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
export const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!;
