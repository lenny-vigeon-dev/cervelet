/**
 * Cloud Function to generate Firebase Custom Tokens for Discord users.
 *
 * Verifies the caller's Discord OAuth access token before minting a
 * Firebase custom token. This prevents token forgery -- callers must
 * prove they own the Discord account by presenting a valid access token.
 */

import { Request, Response } from '@google-cloud/functions-framework';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (singleton)
if (!getApps().length) {
  const hasEnvVars = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;

  initializeApp({
    credential: hasEnvVars
      ? cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
      : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  });
}

/**
 * Verify a Discord OAuth access token and return the user profile.
 * Calls Discord's /users/@me endpoint to confirm the token is valid
 * and extract the user's ID and username.
 */
async function verifyDiscordToken(
  accessToken: string,
): Promise<{ id: string; username: string; email?: string }> {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Discord token verification failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: string;
    username: string;
    email?: string;
  };

  return { id: data.id, username: data.username, email: data.email };
}

/**
 * HTTP Cloud Function to create Firebase Custom Token.
 *
 * Expects POST request with the Discord access token in the JSON body:
 *   { "discordAccessToken": "<token>" }
 *
 * The Authorization header is reserved for Cloud Run IAM (OIDC ID token)
 * when the service is invoked by the frontend proxy. A legacy fallback
 * reads the Discord token from the Authorization header for direct calls
 * (e.g. local testing).
 *
 * Returns:
 *   { "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
 */
export const createFirebaseToken = async (req: Request, res: Response) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Extract Discord access token from body (preferred) or Authorization
    // header (legacy fallback). The frontend proxy sends the OIDC ID token
    // in Authorization for Cloud Run IAM, so the Discord token lives in the
    // request body.
    let accessToken: string | undefined;

    if (req.body?.discordAccessToken && typeof req.body.discordAccessToken === 'string') {
      accessToken = req.body.discordAccessToken;
    } else {
      // Legacy fallback: Authorization header (direct / local testing)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        accessToken = authHeader.split(' ')[1];
      }
    }

    if (!accessToken) {
      res.status(401).json({
        error: 'Missing Discord access token. Send as { "discordAccessToken": "<token>" } in the body.',
      });
      return;
    }

    // Verify the Discord token and get the real user profile
    const discordUser = await verifyDiscordToken(accessToken);

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Creating Firebase token for verified Discord user: ${discordUser.id}`,
        username: discordUser.username,
      }),
    );

    // Create custom token with the verified Discord user ID as UID
    const customToken = await getAuth().createCustomToken(discordUser.id, {
      discord: true,
      username: discordUser.username,
      email: discordUser.email || undefined,
    });

    res.status(200).json({ token: customToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Distinguish auth errors from server errors
    if (message.includes('Discord token verification failed')) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'Discord token verification failed',
          error: message,
        }),
      );
      res.status(401).json({ error: 'Invalid Discord access token' });
    } else {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Error creating Firebase custom token',
          error: message,
        }),
      );
      res.status(500).json({ error: message });
    }
  }
};
