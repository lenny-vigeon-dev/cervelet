import { NextResponse } from "next/server";

/**
 * Proxies Firebase Custom Token requests to the firebase-auth-token Cloud Run service.
 * The client sends its Discord access token; the backend verifies it with Discord
 * before minting a Firebase token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const discordAccessToken = body.discordAccessToken;

    if (!discordAccessToken || typeof discordAccessToken !== "string") {
      return NextResponse.json(
        { error: "Missing discordAccessToken" },
        { status: 400 }
      );
    }

    // Use a dedicated env var for the Cloud Run service URL
    const serviceUrl =
      process.env.FIREBASE_AUTH_TOKEN_URL ||
      `https://firebase-auth-token-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "serverless-488811"}.run.app`;

    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${discordAccessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `firebase-auth-token error (${response.status}):`,
        errorText
      );
      return NextResponse.json(
        { error: `Token service failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in firebase-auth-token proxy:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
