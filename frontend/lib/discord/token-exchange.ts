import { DISCORD_TOKEN_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } from "./config";
import type { DiscordTokenResponse } from "./types";

/**
 * Exchanges an authorization code for an access token.
 *
 * @param code - The authorization code from Discord OAuth callback
 * @returns Promise resolving to the token response
 * @throws Error if the token exchange fails
 */
export async function exchangeCodeForToken(
  code: string
): Promise<DiscordTokenResponse> {
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Discord token exchange failed:", errorData);
    throw new Error("Failed to exchange code for token");
  }

  return response.json();
}
