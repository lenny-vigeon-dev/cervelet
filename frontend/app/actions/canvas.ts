"use server";

import { revalidatePath } from "next/cache";
import { serverApiRequest } from "@/lib/server-api";
import { z } from "zod";

/**
 * Server Actions for canvas mutations.
 * These actions are executed on the server and can be called from Client Components.
 */

const PlacePixelSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid 6-digit hex color"),
});

export type PlacePixelResult =
  | { success: true; message?: string }
  | { success: false; error: string };

/**
 * Places a pixel on the canvas at the specified coordinates with the given color.
 * This Server Action validates the input, makes an authenticated API request,
 * and revalidates the page cache on success.
 *
 * @param x - The x coordinate (0-indexed)
 * @param y - The y coordinate (0-indexed)
 * @param color - The hex color (e.g., "#FF0000")
 * @returns Result object indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await placePixel(10, 20, "#FF0000");
 * if (result.success) {
 *   console.log("Pixel placed!");
 * }
 * ```
 */
export async function placePixel(
  x: number,
  y: number,
  color: string
): Promise<PlacePixelResult> {
  try {
    // Validate input
    const parsed = PlacePixelSchema.safeParse({ x, y, color });

    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    // Make authenticated API request
    await serverApiRequest("/canvas/pixels", {
      method: "POST",
      body: JSON.stringify(parsed.data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Revalidate the home page to show the new pixel
    revalidatePath("/");

    return { success: true, message: "Pixel placed successfully" };
  } catch (error) {
    console.error("Failed to place pixel:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Clears all pixels from the canvas (admin action).
 * Requires appropriate permissions on the API side.
 *
 * @returns Result object indicating success or failure
 */
export async function clearCanvas(): Promise<PlacePixelResult> {
  try {
    await serverApiRequest("/canvas/clear", {
      method: "POST",
    });

    revalidatePath("/");

    return { success: true, message: "Canvas cleared successfully" };
  } catch (error) {
    console.error("Failed to clear canvas:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "An unexpected error occurred" };
  }
}
