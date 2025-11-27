import { sessionStorage } from "@/lib/session-storage";

export interface WritePixelParams {
  x: number;
  y: number;
  color: number; // RGB color as integer (0x000000 to 0xFFFFFF)
}

export interface WritePixelResult {
  success: boolean;
  error?: string;
}

const WRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_WRITE_PIXEL_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/write`
    : "/write");

/**
 * Write a pixel via the serverless worker (Discord token is validated server-side).
 * This avoids Firebase Auth on the client while still enforcing cooldowns on the backend.
 */
export async function writePixel(params: WritePixelParams): Promise<WritePixelResult> {
  const { x, y, color } = params;

  if (x < 0 || y < 0) {
    return { success: false, error: "Invalid coordinates" };
  }

  if (color < 0 || color > 0xFFFFFF) {
    return { success: false, error: "Invalid color value" };
  }

  const accessToken = sessionStorage.getAccessToken();
  if (!accessToken) {
    return { success: false, error: "Missing Discord access token" };
  }

  try {
    const response = await fetch(WRITE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ x, y, color }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error || "Failed to place pixel" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
