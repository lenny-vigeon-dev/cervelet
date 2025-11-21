import { Firestore, Timestamp } from '@google-cloud/firestore';
import { USERS_COLLECTION, CANVAS_COLLECTION, PROJECT_ID } from '../config';
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
   * Writes a pixel and updates the user's timestamp in an atomic transaction
   * This transaction ensures there are no race conditions
   *
   * @param payload - The pixel data to write
   * @param newTimestamp - The new timestamp for the user
   */
  async writePixelTransaction(
    payload: PixelPayload,
    newTimestamp: Timestamp,
  ): Promise<void> {
    const pixelId = `${payload.x}_${payload.y}`;
    const pixelRef = this.db.collection(CANVAS_COLLECTION).doc(pixelId);
    const userRef = this.db.collection(USERS_COLLECTION).doc(payload.userId);

    // Execute transaction to guarantee atomicity
    await this.db.runTransaction(async (transaction) => {
      // 1. Write pixel to canvas collection
      const pixelData: PixelDoc = {
        color: payload.color,
        userId: payload.userId,
        lastUpdatedAt: newTimestamp,
      };
      transaction.set(pixelRef, pixelData);

      // 2. Update user's timestamp
      const userData: UserDoc = {
        lastPixelAt: newTimestamp,
      };
      transaction.set(userRef, userData, { merge: true });
    });
  }

  /**
   * Closes the Firestore connection (useful for tests)
   */
  async close(): Promise<void> {
    await this.db.terminate();
  }
}
