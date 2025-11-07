import { DISCORD_USER_URL } from "./config";
import type { DiscordUser, SessionUser } from "./types";

/**
 * Fetches the Discord user profile using an access token.
 *
 * @param accessToken - The Discord access token
 * @returns Promise resolving to the Discord user data
 * @throws Error if the profile fetch fails
 */
export async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUser> {
  const response = await fetch(DISCORD_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch Discord user profile");
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}

/**
 * Transforms Discord user data into a session user object.
 *
 * @param discordUser - The Discord user data
 * @returns Session user object with formatted data
 */
export function transformToSessionUser(discordUser: DiscordUser): SessionUser {
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : undefined;

  const accentColor = discordUser.accent_color
    ? `#${discordUser.accent_color.toString(16).padStart(6, "0")}`
    : undefined;

  return {
    id: discordUser.id,
    username: discordUser.username,
    email: discordUser.email,
    discriminator: discordUser.discriminator,
    avatarUrl,
    accentColor,
  };
}
