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
   * Update canvas status (start, pause).
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
   * Reset canvas: update metadata and delete all pixel documents.
   */
  async resetCanvas(canvasId: string): Promise<void> {
    const canvasRef = this.db.collection('canvases').doc(canvasId);
    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      throw new Error(`Canvas ${canvasId} not found`);
    }

    const data = canvasDoc.data() as CanvasDoc;
    const newVersion = (data.version || 0) + 1;

    // Delete all pixels first so metadata never claims a reset that
    // hasn't fully completed. If deletion fails partway, Pub/Sub retries
    // and the canvas metadata still reflects the old (consistent) state.
    await this.deleteCollection(`pixels`, canvasId);

    // Only update metadata after all pixels are deleted
    await canvasRef.update({
      status: 'active',
      version: newVersion,
      totalPixels: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });

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
   * Clear all pixels from a canvas without changing version or status.
   */
  async clearCanvas(canvasId: string): Promise<number> {
    const canvasRef = this.db.collection('canvases').doc(canvasId);
    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      throw new Error(`Canvas ${canvasId} not found`);
    }

    const deleted = await this.deleteCollection('pixels', canvasId);

    await canvasRef.update({
      totalPixels: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });

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
