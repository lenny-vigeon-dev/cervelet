import type { SessionUser } from "./types";

/**
 * Generates an HTML page that stores the session in localStorage and redirects.
 *
 * @param user - The session user object
 * @param accessToken - The Discord access token
 * @returns HTML string for the auth callback page
 */
export function generateAuthCallbackHTML(
  user: SessionUser,
  accessToken: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Authenticating...</title>
</head>
<body>
  <script>
    const user = ${JSON.stringify(user)};
    const token = ${JSON.stringify(accessToken)};

    localStorage.setItem('discord_session', JSON.stringify(user));
    localStorage.setItem('discord_access_token', token);

    window.location.href = '/';
  </script>
  <p>Redirecting...</p>
</body>
</html>`;
}
