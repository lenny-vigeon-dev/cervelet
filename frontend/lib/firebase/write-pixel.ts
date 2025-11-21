/**
 * Client-side pixel writing using Firebase SDK
 *
 * This directly writes to Firestore from the frontend.
 * Security is enforced by Firestore security rules.
 */

import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { getFirestoreDb, COLLECTIONS } from './config';

export interface WritePixelParams {
  canvasId: string;
  x: number;
  y: number;
  color: number; // RGB color as integer (0x000000 to 0xFFFFFF)
  userId: string;
}

export interface WritePixelResult {
  success: boolean;
  error?: string;
}

/**
 * Cooldown duration in milliseconds (5 minutes)
 */
const COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Check if user can write a pixel (cooldown check)
 */
async function checkCooldown(userId: string): Promise<{ canWrite: boolean; remainingMs?: number }> {
  const db = getFirestoreDb();
  const userRef = doc(db, COLLECTIONS.USERS, userId);

  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // First pixel for this user
      return { canWrite: true };
    }

    const userData = userDoc.data();
    const lastPixelPlaced = userData.lastPixelPlaced;

    if (!lastPixelPlaced) {
      return { canWrite: true };
    }

    // Calculate elapsed time
    const lastPixelTime = lastPixelPlaced.toMillis();
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastPixelTime;

    if (elapsedTime < COOLDOWN_MS) {
      const remainingTime = COOLDOWN_MS - elapsedTime;
      return { canWrite: false, remainingMs: remainingTime };
    }

    return { canWrite: true };
  } catch (error) {
    console.error('Error checking cooldown:', error);
    throw new Error('Failed to check cooldown');
  }
}

/**
 * Write a pixel to the canvas
 *
 * @param params - Pixel parameters
 * @returns Result indicating success or error
 */
export async function writePixel(params: WritePixelParams): Promise<WritePixelResult> {
  const { canvasId, x, y, color, userId } = params;

  // Validation
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  if (x < 0 || y < 0) {
    return { success: false, error: 'Invalid coordinates' };
  }

  if (color < 0 || color > 0xFFFFFF) {
    return { success: false, error: 'Invalid color value' };
  }

  try {
    // Check cooldown
    const cooldownResult = await checkCooldown(userId);

    if (!cooldownResult.canWrite) {
      const remainingMinutes = Math.ceil((cooldownResult.remainingMs || 0) / 60000);
      return {
        success: false,
        error: `Cooldown active! Wait ${remainingMinutes} more minute${remainingMinutes > 1 ? 's' : ''}`
      };
    }

    const db = getFirestoreDb();
    const now = Timestamp.now();

    // Write pixel to canvas collection
    const pixelId = `${x}_${y}`;
    const pixelRef = doc(db, COLLECTIONS.CANVAS, pixelId);

    await setDoc(pixelRef, {
      canvasId,
      x,
      y,
      color,
      userId,
      lastUpdatedAt: now,
    });

    // Update user's last pixel placed time
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
      id: userId,
      lastPixelPlaced: now,
      updatedAt: now,
    }, { merge: true });

    console.log(`✅ Pixel placed at (${x}, ${y}) with color #${color.toString(16).padStart(6, '0')}`);

    return { success: true };
  } catch (error) {
    console.error('Error writing pixel:', error);

    // Check if it's a permission error
    if (error instanceof Error && error.message.includes('permission')) {
      return {
        success: false,
        error: 'Permission denied. You may not have write access to this canvas.'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
