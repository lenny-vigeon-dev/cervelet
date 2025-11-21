/**
 * Firebase Authentication with Discord Custom Tokens
 *
 * This module handles the bridge between Discord OAuth and Firebase Auth.
 * After Discord login, we exchange the Discord user info for a Firebase Custom Token.
 */

import { getAuth, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseApp } from './config';
import type { UserProfile } from '@/types/session';

/**
 * Sign in to Firebase using Discord user information
 *
 * Flow:
 * 1. User completes Discord OAuth
 * 2. Frontend calls backend to get Firebase Custom Token
 * 3. Use Custom Token to sign in to Firebase
 * 4. Firebase Auth session is now active for Firestore access
 *
 * @param discordUser - Discord user profile from OAuth
 * @returns Firebase user object or null on error
 */
export async function signInWithDiscord(discordUser: UserProfile) {
  try {
    console.log('🔐 Signing in to Firebase with Discord user:', discordUser.id);

    // 1. Get Firebase Custom Token from backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/firebase-auth-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discordUserId: discordUser.id,
          username: discordUser.username,
          email: discordUser.email,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get Firebase token');
    }

    const { token } = await response.json();

    // 2. Sign in to Firebase with Custom Token
    const app = getFirebaseApp();
    const auth = getAuth(app);

    const userCredential = await signInWithCustomToken(auth, token);

    console.log('✅ Firebase Auth successful:', userCredential.user.uid);

    return userCredential.user;
  } catch (error) {
    console.error('❌ Firebase Auth failed:', error);
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
    console.log('✅ Firebase sign out successful');
  } catch (error) {
    console.error('❌ Firebase sign out failed:', error);
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
