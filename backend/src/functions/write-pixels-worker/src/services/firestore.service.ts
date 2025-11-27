import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';
import { USERS_COLLECTION, PIXELS_COLLECTION, DEFAULT_CANVAS_ID, PROJECT_ID } from '../config';
import { UserDoc, PixelDoc, PixelPayload } from '../types';

/**
 * Firestore management service for write-pixels-worker
 */
export class FirestoreService {
  private db: Firestore;

  constructor() {
    this.db = new Firestore({
      projectId: PROJECT_ID,
    });
  }

  /**
   * Retrieves the user document
   * @param userId - User ID
   * @returns The user document or null if it doesn't exist
   */
  async getUser(userId: string): Promise<UserDoc | null> {
    const userRef = this.db.collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as UserDoc;
  }

  /**
   * Writes a pixel and creates or updates the user profile in an atomic transaction
   * This transaction ensures there are no race conditions
   *
   * @param payload - The pixel data to write
   * @param newTimestamp - The new timestamp for the user
   */
  async writePixelTransaction(
    payload: PixelPayload,
    newTimestamp: Timestamp,
  ): Promise<void> {
    const canvasId = DEFAULT_CANVAS_ID;
    const pixelId = `${canvasId}_${payload.x}_${payload.y}`;
    const pixelRef = this.db.collection(PIXELS_COLLECTION).doc(pixelId);
    const userRef = this.db.collection(USERS_COLLECTION).doc(payload.userId);

    await this.db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);

      const pixelData: PixelDoc = {
        canvasId: canvasId,
        x: payload.x,
        y: payload.y,
        color: payload.color,
        userId: payload.userId,
        updatedAt: newTimestamp,
      };
      transaction.set(pixelRef, pixelData);

      if (userSnapshot.exists) {
        transaction.update(userRef, {
          username: payload.username,
          lastPixelPlaced: newTimestamp,
          totalPixelsPlaced: FieldValue.increment(1),
        });
      } else {
        const newUserData: UserDoc = {
          id: payload.userId,
          username: payload.username,
          role: 'user',
          lastPixelPlaced: newTimestamp,
          totalPixelsPlaced: 1,
          createdAt: newTimestamp,
        };
        transaction.set(userRef, newUserData);
      }
    });
  }

  /**
   * Closes the Firestore connection (useful for tests)
   */
  async close(): Promise<void> {
    await this.db.terminate();
  }
}
