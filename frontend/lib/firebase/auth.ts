/**
 * Firebase Authentication with Discord Custom Tokens
 *
 * This module handles the bridge between Discord OAuth and Firebase Auth.
 * After Discord login, the Discord access token is exchanged for a
 * Firebase Custom Token via the firebase-auth-token Cloud Run service.
 */

import {
  getAuth,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseApp } from "./config";

/**
 * Sign in to Firebase using a Discord access token.
 *
 * Flow:
 * 1. User completes Discord OAuth
 * 2. Frontend sends Discord access token to /api/firebase-auth-token
 * 3. Backend verifies token with Discord, mints Firebase Custom Token
 * 4. Frontend signs into Firebase with the custom token
 *
 * @param discordAccessToken - Discord OAuth access token
 * @returns Firebase user object or null on error
 */
export async function signInWithDiscord(discordAccessToken: string) {
  try {
    const response = await fetch("/api/firebase-auth-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
