import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';
import {
  USERS_COLLECTION,
  PIXELS_COLLECTION,
  DEFAULT_CANVAS_ID,
  PROJECT_ID,
  COOLDOWN_MS,
} from '../config';
import { UserDoc, PixelDoc, PixelHistoryDoc, PixelPayload } from '../types';

const CANVASES_COLLECTION = 'canvases';
const PIXEL_HISTORY_COLLECTION = 'pixelHistory';

/**
 * Result of writePixelTransaction indicating whether the write succeeded
 * or was rejected by cooldown.
 */
export interface WriteResult {
  success: boolean;
  /** Present when cooldown blocked the write */
  cooldownRemainingMs?: number;
}

/**
 * Firestore management service for write-pixels-worker.
 *
 * All rate-limiting, pixel writes, history appends, and metadata updates
 * happen inside a single Firestore transaction to prevent TOCTOU races
 * and ensure consistency under concurrent writes.
 */
export class FirestoreService {
  private db: Firestore;

  constructor() {
    this.db = new Firestore({
      projectId: PROJECT_ID,
    });
  }

  /**
   * Retrieves the user document.
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
   * Atomically:
   * 1. Check cooldown (rate limit) inside the transaction
   * 2. Write pixel to 'pixels' collection
   * 3. Append to 'pixelHistory' collection (audit trail)
   * 4. Create/update user profile
   * 5. Increment totalPixels on 'canvases' metadata
   *
   * Returns a WriteResult: if cooldown is active, returns { success: false, cooldownRemainingMs }.
   * Callers should NOT retry on cooldown -- it's an expected user-facing rate limit.
   */
  async writePixelTransaction(
    payload: PixelPayload,
    newTimestamp: Timestamp,
  ): Promise<WriteResult> {
    const canvasId = DEFAULT_CANVAS_ID;
    const pixelId = `${canvasId}_${payload.x}_${payload.y}`;

    const pixelRef = this.db.collection(PIXELS_COLLECTION).doc(pixelId);
    const userRef = this.db.collection(USERS_COLLECTION).doc(payload.userId);
    const canvasRef = this.db.collection(CANVASES_COLLECTION).doc(canvasId);
    const historyRef = this.db.collection(PIXEL_HISTORY_COLLECTION).doc();

    return this.db.runTransaction(async (transaction) => {
      // 1. Read user, pixel, and canvas documents INSIDE the transaction
      const [userSnapshot, pixelSnapshot, canvasSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(pixelRef),
        transaction.get(canvasRef),
      ]);

      // Fail fast if the canvas document doesn't exist -- pixels can only
      // be placed on a canvas that was created by an admin.
      if (!canvasSnapshot.exists) {
        throw new Error(`Canvas "${canvasId}" does not exist`);
      }

      const existingUser = userSnapshot.exists
        ? (userSnapshot.data() as UserDoc)
        : null;
      const isNewPixel = !pixelSnapshot.exists;

      // 2. Enforce rate limit (cooldown check within transaction prevents TOCTOU race)
      if (existingUser?.lastPixelPlaced) {
        const lastPixelTime = existingUser.lastPixelPlaced.toMillis();
        const elapsedMs = newTimestamp.toMillis() - lastPixelTime;

        if (elapsedMs < COOLDOWN_MS) {
          return {
            success: false,
            cooldownRemainingMs: COOLDOWN_MS - elapsedMs,
          };
        }
      }

      // 3. Write pixel document
      const pixelData: PixelDoc = {
        canvasId,
        x: payload.x,
        y: payload.y,
        color: payload.color,
        userId: payload.userId,
        username: payload.username,
        updatedAt: newTimestamp,
      };
      transaction.set(pixelRef, pixelData);

      // 4. Append to pixel history (audit trail -- append-only, never updated)
      const historyData: PixelHistoryDoc = {
        canvasId,
        x: payload.x,
        y: payload.y,
        color: payload.color,
        userId: payload.userId,
        username: payload.username,
        createdAt: newTimestamp,
      };
      transaction.set(historyRef, historyData);

      // 5. Create or update user profile
      if (existingUser) {
        const updateData: FirebaseFirestore.UpdateData<UserDoc> = {
          username: payload.username,
          lastPixelPlaced: newTimestamp,
          totalPixelsPlaced: FieldValue.increment(1),
        };
        if (payload.avatarUrl) {
          updateData.avatarUrl = payload.avatarUrl;
        }
        transaction.update(userRef, updateData);
      } else {
        const newUserData: UserDoc = {
          id: payload.userId,
          username: payload.username,
          avatarUrl: payload.avatarUrl,
          role: 'user',
          lastPixelPlaced: newTimestamp,
          totalPixelsPlaced: 1,
          createdAt: newTimestamp,
        };
        transaction.set(userRef, newUserData);
      }

      // 6. Update canvas metadata (canvas existence verified in step 1)
      //    Only increment totalPixels when placing a pixel at a new coordinate
      //    to avoid drift from overwrites of existing pixels.
      const canvasUpdate: Record<string, unknown> = {
        updatedAt: newTimestamp,
      };
      if (isNewPixel) {
        canvasUpdate.totalPixels = FieldValue.increment(1);
      }
      transaction.update(canvasRef, canvasUpdate);

      return { success: true };
    });
  }

  /**
   * Closes the Firestore connection (useful for graceful shutdown).
   */
  async close(): Promise<void> {
    await this.db.terminate();
  }
}
