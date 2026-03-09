import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/discord/token-exchange";
import {
  fetchDiscordUser,
  transformToSessionUser,
} from "@/lib/discord/user-profile";
import { generateAuthCallbackHTML } from "@/lib/discord/auth-response";

/**
 * Discord OAuth callback handler.
 * Verifies the CSRF state token, exchanges the authorization code for an
 * access token, fetches the user profile, and returns an HTML page that
 * completes client-side auth setup.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Discord OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", request.url)
    );
  }

  // Verify CSRF state token
  const storedState = request.cookies.get("oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", request.url)
    );
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Fetch user profile
    const discordUser = await fetchDiscordUser(tokenData.access_token);

    // Transform to session user
    const sessionUser = transformToSessionUser(discordUser);

    // Generate HTML response that stores session and signs into Firebase
    const html = generateAuthCallbackHTML(sessionUser, tokenData.access_token);

    const response = new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    // Clear the CSRF cookie
    response.cookies.delete("oauth_state");

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/?error=internal_error", request.url)
    );
  }
}
