import { Firestore, FieldValue } from '@google-cloud/firestore';
import { CONFIG } from '../config.js';
import type { CanvasDoc } from '../types.js';

export class FirestoreService {
  private readonly db: Firestore;

  constructor() {
    this.db = new Firestore({ projectId: CONFIG.gcpProject });
  }

  /**
   * Get canvas metadata document.
   */
  async getCanvas(canvasId: string): Promise<CanvasDoc | null> {
    const doc = await this.db.collection('canvases').doc(canvasId).get();
    if (!doc.exists) return null;
    return doc.data() as CanvasDoc;
  }

  /**
   * Update canvas status (start, pause). Used by /lock, /unlock, and
   * /session start|pause commands. Does NOT set 'resetting' — that
   * literal is reserved for the internal reset/clear lock managed by
   * setStatusTransactional.
   */
  async updateCanvasStatus(
    canvasId: string,
    status: 'active' | 'paused',
  ): Promise<void> {
    await this.db.collection('canvases').doc(canvasId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Reset canvas: transactionally acquire the 'resetting' lock, delete
   * all pixels, then transactionally release the lock (bumping version
   * and zeroing totalPixels).
   *
   * Three phases:
   *   Phase 1 (txn): status -> 'resetting'. Idempotent if already resetting.
   *   Phase 2:       delete all pixels in batches. Idempotent.
   *   Phase 3 (txn): status -> 'active', version++, totalPixels = 0.
   *
   * If Phase 2 or Phase 3 crashes, Pub/Sub redelivery re-runs the whole
   * handler. Phase 1 is a no-op on redelivery (status already 'resetting'),
   * Phase 2 is idempotent (re-deleting missing docs is a no-op), and
   * Phase 3 completes the operation. After 10 failed deliveries the
   * message lands in the DLQ and the canvas is left visibly stuck in
   * 'resetting' for operator intervention.
   *
   * While in 'resetting', the write-pixels-worker rejects pixel writes
   * (see backend/src/functions/write-pixels-worker/src/services/firestore.service.ts).
   */
  async resetCanvas(canvasId: string): Promise<void> {
    const canvasRef = this.db.collection('canvases').doc(canvasId);

    // Phase 1: acquire the lock (transactional, idempotent).
    await this.setStatusTransactional(
      canvasId,
      ['active', 'paused', 'resetting'],
      'resetting',
    );

    // Phase 2: delete pixels (batched, non-transactional, idempotent).
    await this.deleteCollection('pixels', canvasId);

    // Phase 3: release the lock and publish the new canvas generation.
    // We need the pre-reset version to increment it; read it outside the
    // transaction is safe because Phase 1's lock prevents any writer
    // from mutating version while we're resetting.
    const current = await canvasRef.get();
    const currentData = current.data() as CanvasDoc | undefined;
    const newVersion = (currentData?.version ?? 0) + 1;

    await this.setStatusTransactional(
      canvasId,
      ['resetting'],
      'active',
      {
        version: newVersion,
        totalPixels: 0,
      },
    );

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Canvas ${canvasId} reset successfully`,
        newVersion,
      }),
    );
  }

  /**
   * Count pixels in a canvas.
   */
  async countPixels(canvasId: string): Promise<number> {
    const snapshot = await this.db
      .collection('pixels')
      .where('canvasId', '==', canvasId)
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Clear all pixels from a canvas without changing version.
   *
   * Same 3-phase shape as resetCanvas, but Phase 3 does NOT bump
   * version — clear is a pixel wipe, not a new canvas generation.
   * Returns the number of deleted pixels for the caller's user-facing
   * report.
   */
  async clearCanvas(canvasId: string): Promise<number> {
    // Phase 1: acquire the lock.
    await this.setStatusTransactional(
      canvasId,
      ['active', 'paused', 'resetting'],
      'resetting',
    );

    // Phase 2: delete pixels.
    const deleted = await this.deleteCollection('pixels', canvasId);

    // Phase 3: release the lock, zero totalPixels (no version bump).
    await this.setStatusTransactional(
      canvasId,
      ['resetting'],
      'active',
      {
        totalPixels: 0,
      },
    );

    return deleted;
  }

  /**
   * Resize the canvas dimensions.
   */
  async resizeCanvas(canvasId: string, width: number, height: number): Promise<void> {
    const canvasRef = this.db.collection('canvases').doc(canvasId);
    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      throw new Error(`Canvas ${canvasId} not found`);
    }

    await canvasRef.update({
      width,
      height,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Set the cooldown duration (in seconds) on the canvas document.
   */
  async setCooldown(canvasId: string, cooldownSeconds: number): Promise<void> {
    const canvasRef = this.db.collection('canvases').doc(canvasId);
    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      throw new Error(`Canvas ${canvasId} not found`);
    }

    await canvasRef.update({
      cooldownSeconds,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Transactionally transition the canvas status.
   *
   * Reads the canvas doc inside a transaction, verifies it exists,
   * asserts the current status is in `expectedStatuses`, and writes the
   * new status plus any `extraUpdates` (e.g. version bump, totalPixels
   * reset). `updatedAt` is always bumped to the server timestamp.
   *
   * This is the primitive for the reset/clear lock: Phase 1 uses it to
   * acquire the lock (expected = active|paused|resetting, new =
   * resetting), Phase 3 uses it to release (expected = resetting, new
   * = active, with extraUpdates carrying version/totalPixels).
   */
  private async setStatusTransactional(
    canvasId: string,
    expectedStatuses: ReadonlyArray<CanvasDoc['status']>,
    newStatus: CanvasDoc['status'],
    extraUpdates: Record<string, unknown> = {},
  ): Promise<void> {
    const canvasRef = this.db.collection('canvases').doc(canvasId);

    await this.db.runTransaction(async (txn) => {
      const snap = await txn.get(canvasRef);
      if (!snap.exists) {
        throw new Error(`Canvas ${canvasId} not found`);
      }

      const data = snap.data() as CanvasDoc;
      if (!expectedStatuses.includes(data.status)) {
        throw new Error(
          `Canvas ${canvasId} has unexpected status '${data.status}'; expected one of [${expectedStatuses.join(', ')}]`,
        );
      }

      txn.update(canvasRef, {
        ...extraUpdates,
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  /**
   * Delete all documents in a collection matching a canvasId, in batches.
   * Returns the total number of deleted documents.
   */
  private async deleteCollection(
    collectionName: string,
    canvasId: string,
  ): Promise<number> {
    const batchSize = 500;
    const query = this.db
      .collection(collectionName)
      .where('canvasId', '==', canvasId)
      .limit(batchSize);

    let deleted = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snapshot = await query.get();
      if (snapshot.empty) break;

      const batch = this.db.batch();
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();

      deleted += snapshot.size;
      console.log(
        JSON.stringify({
          level: 'info',
          message: `Deleted ${deleted} pixel documents so far`,
        }),
      );

      if (snapshot.size < batchSize) break;
    }

    return deleted;
  }
}
