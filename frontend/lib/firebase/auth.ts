/**
 * Firebase Authentication with Discord Custom Tokens
 *
 * This module handles the bridge between Discord OAuth and Firebase Auth.
 * After Discord login, the Discord access token is exchanged for a
 * Firebase Custom Token via the cf-proxy's /auth/firebase-token endpoint.
 */

import {
  getAuth,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseApp } from "./config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_GATEWAY_KEY || "";
const FIREBASE_TOKEN_ENDPOINT = API_URL
  ? `${API_URL}/auth/firebase-token`
  : "/auth/firebase-token";

/**
 * Sign in to Firebase using a Discord access token.
 *
 * Flow:
 * 1. User completes Discord OAuth
 * 2. Frontend sends Discord access token to API Gateway /auth/firebase-token
 * 3. cf-proxy verifies token with Discord, mints Firebase Custom Token
 * 4. Frontend signs into Firebase with the custom token
 *
 * @param discordAccessToken - Discord OAuth access token
 * @returns Firebase user object or null on error
 */
export async function signInWithDiscord(discordAccessToken: string) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }

    const response = await fetch(FIREBASE_TOKEN_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ discordAccessToken }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to get Firebase token");
    }

    const { token } = await response.json();

    const app = getFirebaseApp();
    const auth = getAuth(app);
    const userCredential = await signInWithCustomToken(auth, token);

    return userCredential.user;
  } catch (error) {
    console.error("Firebase Auth failed:", error);
    return null;
  }
}

/**
 * Sign out from Firebase
 */
export async function signOut() {
  try {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Firebase sign out failed:", error);
  }
}

/**
 * Get current Firebase Auth user
 */
export function getCurrentFirebaseUser() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  return auth.currentUser;
}
