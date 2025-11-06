import { ApiError } from "@/lib/api";
import { serverApiRequest } from "@/lib/server-api";
import { SessionStateSchema } from "@/lib/schemas";
import { hasApiData, type ApiResponse } from "@/types/api";
import type { SessionState } from "@/types/session";

const SESSION_ENDPOINT = "/auth/session";

function extractSession(
  payload: SessionState | ApiResponse<SessionState>
): SessionState {
  if (hasApiData<SessionState>(payload)) {
    return payload.data;
  }
  return payload as SessionState;
}

/**
 * Fetches the current user session from the API.
 * Returns an unauthenticated state on 401 errors or validation failures.
 * Validates the response using Zod schema for runtime type safety.
 *
 * @returns Promise resolving to the validated session state
 */
export async function fetchSession(): Promise<SessionState> {
  try {
    const payload = await serverApiRequest<
      SessionState | ApiResponse<SessionState>
    >(SESSION_ENDPOINT);
    const data = extractSession(payload);

    // Validate with Zod
    return SessionStateSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { user: null, isAuthenticated: false };
    }
    console.error("Failed to fetch session", error);
    return { user: null, isAuthenticated: false };
  }
}
