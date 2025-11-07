import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/discord/token-exchange";
import { fetchDiscordUser, transformToSessionUser } from "@/lib/discord/user-profile";
import { generateAuthCallbackHTML } from "@/lib/discord/auth-response";

/**
 * Discord OAuth callback handler.
 * Exchanges the authorization code for an access token and fetches user profile.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
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

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Fetch user profile
    const discordUser = await fetchDiscordUser(tokenData.access_token);

    // Transform to session user
    const sessionUser = transformToSessionUser(discordUser);

    // Generate HTML response with localStorage script
    const html = generateAuthCallbackHTML(sessionUser, tokenData.access_token);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=internal_error", request.url)
    );
  }
}
