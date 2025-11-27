import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb, COLLECTIONS } from './config';

export interface PixelInfo {
  x: number;
  y: number;
  color: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  updatedAt: Date;
}

export interface UserInfo {
  id: string;
  username: string;
  avatarUrl?: string;
  totalPixelsPlaced: number;
}

/**
 * Fetch pixel information from Firestore
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param canvasId - Canvas ID (default: 'main-canvas')
 * @returns Pixel information or null if not found
 */
export async function getPixelInfo(
  x: number,
  y: number,
  canvasId: string = 'main-canvas'
): Promise<PixelInfo | null> {
  const db = getFirestoreDb();
  const pixelId = `${canvasId}_${x}_${y}`;
  const pixelRef = doc(db, COLLECTIONS.PIXELS, pixelId);

  try {
    const pixelDoc = await getDoc(pixelRef);

    if (!pixelDoc.exists()) {
      return null;
    }

    const data = pixelDoc.data();
    const userId = data.userId || 'unknown';

    // Convert color integer to hex
    const colorInt = data.color as number;
    const colorHex = `#${colorInt.toString(16).padStart(6, '0')}`;

    // If pixel has username/avatarUrl, use it directly
    let username = data.username;
    let avatarUrl = data.avatarUrl;

    // Otherwise, fetch from users collection
    if (!username && userId !== 'unknown') {
      const userInfo = await getUserInfo(userId);
      if (userInfo) {
        username = userInfo.username;
        avatarUrl = userInfo.avatarUrl;
      }
    }

    return {
      x,
      y,
      color: colorHex,
      userId,
      username: username || 'Unknown User',
      avatarUrl,
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching pixel info:', error);
    return null;
  }
}

/**
 * Fetch user information from Firestore
 * @param userId - Discord user ID
 * @returns User information or null if not found
 */
export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  const db = getFirestoreDb();
  const userRef = doc(db, COLLECTIONS.USERS, userId);

  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();

    return {
      id: userId,
      username: data.username || 'Unknown User',
      avatarUrl: data.avatarUrl,
      totalPixelsPlaced: data.totalPixelsPlaced || 0,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}
