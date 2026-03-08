import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";

/**
 * Discord OAuth redirect route handler.
 * Generates a CSRF state token, stores it in a secure cookie,
 * and redirects users to Discord's OAuth authorization page.
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

  // Generate CSRF state token
  const state = randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
  });

  const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;

  const response = NextResponse.redirect(authUrl, { status: 307 });

  // Store state in HTTP-only cookie for CSRF verification
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
