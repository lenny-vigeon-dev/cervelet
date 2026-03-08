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

    // Increment version and reset status
    await canvasRef.update({
      status: 'active',
      version: (data.version || 0) + 1,
      totalPixels: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete all pixels for this canvas in batches
    await this.deleteCollection(`pixels`, canvasId);

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Canvas ${canvasId} reset successfully`,
        newVersion: (data.version || 0) + 1,
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
   * Delete all documents in a collection matching a canvasId, in batches.
   */
  private async deleteCollection(
    collectionName: string,
    canvasId: string,
  ): Promise<void> {
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
  }
}
