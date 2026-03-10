/**
 * API configuration and environment variables.
 *
 * Note: NEXT_PUBLIC_API_URL may be undefined during SSR or build when
 * the env var is not set. Consumers must guard against undefined values
 * rather than relying on a top-level throw that breaks module loading.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const BASE_URL = API_URL ? API_URL.replace(/\/+$/, "") : "";
