/**
 * API configuration and environment variables.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not defined. Please set it in your environment."
  );
}

export const BASE_URL = API_URL.replace(/\/+$/, "");
