import { NextResponse } from "next/server";

/**
 * Fetch a Google OIDC ID token from the GCP metadata server.
 *
 * On Cloud Run the metadata server is always available. The returned
 * token authenticates the calling service's SA (`proxy-svc`) to the
 * target Cloud Run service (firebase-auth-token) via `roles/run.invoker`.
 *
 * Returns `null` when not running on GCP (local dev).
 */
async function getIdToken(audience: string): Promise<string | null> {
  const url =
    `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${audience}`;

  try {
    const res = await fetch(url, {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (res.ok) return res.text();

    console.warn(`Metadata server returned ${res.status} fetching ID token`);
    return null;
  } catch {
    // Metadata server unreachable (local dev / non-GCP environment)
    return null;
  }
}

/**
 * Proxies Firebase Custom Token requests to the firebase-auth-token Cloud Run service.
 *
 * The client sends its Discord access token in the JSON body. This route:
 *  1. Obtains a Google OIDC ID token to authenticate to the internal Cloud Run
 *     service (required because firebase-auth-token is not publicly accessible).
 *  2. Forwards the Discord token in the request body (NOT the Authorization
 *     header, which carries the OIDC token for Cloud Run IAM).
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

    // Require an explicit env var for the Cloud Run service URL.
    // The Cloud Run URL format is not derivable; fail fast if not configured.
    const serviceUrl = process.env.FIREBASE_AUTH_TOKEN_URL;
    if (!serviceUrl) {
      console.error("FIREBASE_AUTH_TOKEN_URL environment variable is not set");
      return NextResponse.json(
        { error: "Firebase auth token service is not configured" },
        { status: 500 }
      );
    }

    // Build headers: OIDC ID token for Cloud Run auth (when on GCP)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const idToken = await getIdToken(serviceUrl);
    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    // Discord token goes in the body, not the Authorization header
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ discordAccessToken }),
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
