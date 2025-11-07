import { NextResponse } from "next/server";

const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";

/**
 * Discord OAuth redirect route handler.
 * Redirects users to Discord's OAuth authorization page.
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Discord OAuth is not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });

  const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;

  return NextResponse.redirect(authUrl, {
    status: 307, // Temporary redirect preserving the request method
  });
}
