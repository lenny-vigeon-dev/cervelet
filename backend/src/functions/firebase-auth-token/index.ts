/**
 * Cloud Function to generate Firebase Custom Tokens for Discord users
 *
 * This allows Discord-authenticated users to access Firestore with proper
 * authentication and security rules enforcement.
 */

import { Request, Response } from '@google-cloud/functions-framework';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (singleton)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

interface CreateTokenRequest {
  discordUserId: string;
  username?: string;
  email?: string;
}

/**
 * HTTP Cloud Function to create Firebase Custom Token
 *
 * Expects POST request with:
 * {
 *   "discordUserId": "123456789",
 *   "username": "user#1234",
 *   "email": "user@example.com"
 * }
 *
 * Returns:
 * {
 *   "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
export const createFirebaseToken = async (req: Request, res: Response) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { discordUserId, username, email } = req.body as CreateTokenRequest;

    // Validate input
    if (!discordUserId || typeof discordUserId !== 'string') {
      res.status(400).json({ error: 'discordUserId is required' });
      return;
    }

    console.log(`Creating Firebase token for Discord user: ${discordUserId}`);

    // Create custom token with Discord user ID as UID
    // This creates or updates the Firebase user automatically
    const customToken = await getAuth().createCustomToken(discordUserId, {
      // Custom claims
      discord: true,
      username: username || 'Unknown',
      email: email || undefined,
    });

    console.log(`✅ Token created successfully for ${discordUserId}`);

    res.status(200).json({
      token: customToken,
    });
  } catch (error) {
    console.error('Error creating custom token:', error);

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};
