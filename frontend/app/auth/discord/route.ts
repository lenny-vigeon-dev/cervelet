import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

/**
 * Discord OAuth redirect route handler.
 * Redirects users to the API Gateway's Discord OAuth flow.
 */

const DISCORD_AUTH_PATH = "/auth/discord";

/**
 * GET /auth/discord
 * Redirects to the API Gateway's Discord OAuth endpoint.
 * The API Gateway handles the OAuth flow and sets the session cookie.
 */
export async function GET() {
  // API_URL is guaranteed to be defined by the import check
  const authUrl = `${API_URL!.replace(/\/$/, "")}${DISCORD_AUTH_PATH}`;

  return NextResponse.redirect(authUrl, {
    status: 307, // Temporary redirect preserving the request method
  });
}
