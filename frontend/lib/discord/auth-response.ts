import type { SessionUser } from "./types";

/**
 * Safely serializes a value into a <script> context.
 * Prevents XSS by escaping characters that could break out of the script tag.
 */
function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Generates an HTML page that:
 * 1. Stores the Discord session in localStorage
 * 2. Exchanges the Discord token for a Firebase Custom Token
 * 3. Stores the Firebase token in localStorage for the React app to consume
 * 4. Redirects to the canvas page (Firebase sign-in happens in useSession hook)
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
  <style>
    body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .loader { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: #ef4444; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p id="status">Signing in...</p>
  </div>
  <script>
    (async function() {
      const user = ${safeJsonStringify(user)};
      const discordToken = ${safeJsonStringify(accessToken)};
      const statusEl = document.getElementById('status');

      try {
        // 1. Store Discord session in localStorage
        localStorage.setItem('discord_session', JSON.stringify(user));
        localStorage.setItem('discord_access_token', discordToken);

        // 2. Exchange Discord token for Firebase Custom Token via API Gateway
        statusEl.textContent = 'Setting up Firebase auth...';

        const apiUrl = ${safeJsonStringify(process.env.NEXT_PUBLIC_API_URL || "")};
        const apiKey = ${safeJsonStringify(process.env.NEXT_PUBLIC_API_GATEWAY_KEY || "")};
        const tokenEndpoint = apiUrl ? apiUrl + '/auth/firebase-token' : '/auth/firebase-token';

        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (apiKey) fetchHeaders['x-api-key'] = apiKey;

        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify({
            discordAccessToken: discordToken,
          }),
        });

        if (response.ok) {
          // 3. Store Firebase custom token for the app to consume on load
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('firebase_custom_token', data.token);
          }
        } else {
          const err = await response.json().catch(() => ({}));
          console.warn('Firebase auth skipped:', err.error || response.statusText);
          // Non-fatal: Discord session is stored, canvas still works in read-only
        }

        // 4. Redirect to canvas (Firebase sign-in happens in the React app)
        window.location.href = '/';
      } catch (err) {
        console.error('Auth callback error:', err);
        // Still redirect -- Discord session is stored for basic functionality
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`;
}
