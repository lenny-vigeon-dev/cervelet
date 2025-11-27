/**
 * Firebase Client Configuration
 *
 * This configures Firebase for client-side real-time updates from Firestore.
 * Uses Firebase JS SDK for listening to pixel changes in real-time.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Debug: Log config (remove after testing)
console.log('🔧 Firebase config loaded:', {
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

let app: FirebaseApp;
let db: Firestore;

/**
 * Initialize Firebase app (singleton pattern)
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    // Only initialize if not already initialized
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

/**
 * Get Firestore instance
 */
export function getFirestoreDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    db = getFirestore(firebaseApp);

    // Connect to emulator in development if configured
    if (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(db, host, parseInt(port, 10));
      console.log('🔧 Connected to Firestore Emulator');
    }
  }
  return db;
}

/**
 * Firestore collection names
 */
export const COLLECTIONS = {
  CANVAS: 'canvas',
  PIXELS: 'pixels',
  USERS: 'users',
  PIXEL_HISTORY: 'pixelHistory',
} as const;
