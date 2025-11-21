import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { createCanvas } from 'canvas';
import { config } from './config';
import type { Canvas, Pixel, SnapshotMetadata } from './types';

export class SnapshotService {
  private firestore: Firestore;
  private storage: Storage;
  private bucket: any;

  constructor() {
    this.firestore = new Firestore({
      projectId: config.projectId,
    });
    this.storage = new Storage({
      projectId: config.projectId,
    });
    this.bucket = this.storage.bucket(config.storage.bucketName);
  }

  /**
   * Generate a snapshot of the canvas and upload it to Cloud Storage
   */
  async generateSnapshot(canvasId: string = config.firestore.defaultCanvasId): Promise<SnapshotMetadata> {
    console.log(`Starting snapshot generation for canvas: ${canvasId}`);

    // 1. Get canvas metadata
    const canvasData = await this.getCanvasMetadata(canvasId);
    console.log(`Canvas metadata: ${canvasData.width}x${canvasData.height}, ${canvasData.totalPixels} pixels`);

    // 2. Fetch all pixels for this canvas
    const pixels = await this.fetchAllPixels(canvasId);
    console.log(`Fetched ${pixels.length} pixels from Firestore`);

    // 3. Generate canvas image
    const imageBuffer = await this.renderCanvas(canvasData, pixels);
    console.log(`Generated canvas image: ${imageBuffer.length} bytes`);

    // 4. Upload to Cloud Storage
    const timestamp = new Date().toISOString();
    await this.uploadSnapshot(imageBuffer, timestamp, canvasData);
    console.log(`Uploaded snapshot to Cloud Storage`);

    return {
      canvasId,
      timestamp,
      width: canvasData.width,
      height: canvasData.height,
      totalPixels: pixels.length,
      version: canvasData.version,
    };
  }

  /**
   * Get canvas metadata from Firestore
   */
  private async getCanvasMetadata(canvasId: string): Promise<Canvas> {
    const canvasRef = this.firestore
      .collection(config.firestore.canvasCollection)
      .doc(canvasId);

    const canvasDoc = await canvasRef.get();

    if (!canvasDoc.exists) {
      console.log(`Canvas ${canvasId} not found, using defaults`);
      return {
        id: canvasId,
        width: config.canvas.defaultWidth,
        height: config.canvas.defaultHeight,
        version: 1,
        createdAt: Firestore.Timestamp.now(),
        updatedAt: Firestore.Timestamp.now(),
        totalPixels: 0,
      };
    }

    return canvasDoc.data() as Canvas;
  }

  /**
   * Fetch all pixels for a canvas from Firestore
   */
  private async fetchAllPixels(canvasId: string): Promise<Pixel[]> {
    const pixels: Pixel[] = [];
    const pixelsCollection = this.firestore.collection(config.firestore.pixelsCollection);

    // Query pixels for this canvas
    const query = pixelsCollection.where('canvasId', '==', canvasId);

    // Use batched fetching for better performance
    const snapshot = await query.get();

    snapshot.forEach((doc) => {
      pixels.push(doc.data() as Pixel);
    });

    return pixels;
  }

  /**
   * Render the canvas as a PNG image
   */
  private async renderCanvas(canvasData: Canvas, pixels: Pixel[]): Promise<Buffer> {
    const { width, height } = canvasData;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = config.canvas.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw each pixel
    for (const pixel of pixels) {
      if (pixel.x >= 0 && pixel.x < width && pixel.y >= 0 && pixel.y < height) {
        ctx.fillStyle = this.colorToHex(pixel.color);
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      }
    }

    // Convert to PNG buffer
    return canvas.toBuffer('image/png');
  }

  /**
   * Convert color number to hex string
   */
  private colorToHex(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  /**
   * Upload snapshot to Cloud Storage
   */
  private async uploadSnapshot(
    imageBuffer: Buffer,
    timestamp: string,
    canvasData: Canvas
  ): Promise<void> {
    const metadata = {
      contentType: 'image/png',
      metadata: {
        canvasId: canvasData.id,
        timestamp,
        width: canvasData.width.toString(),
        height: canvasData.height.toString(),
        version: canvasData.version.toString(),
      },
      cacheControl: 'public, max-age=60', // Cache for 1 minute
    };

    // Upload latest snapshot (overwrite)
    const latestFile = this.bucket.file(config.storage.latestSnapshotPath);
    await latestFile.save(imageBuffer, metadata);
    console.log(`Uploaded to: ${config.storage.latestSnapshotPath}`);

    // Upload historical snapshot (with timestamp)
    const historicalPath = `${config.storage.historicalSnapshotPrefix}${timestamp}.png`;
    const historicalFile = this.bucket.file(historicalPath);
    await historicalFile.save(imageBuffer, metadata);
    console.log(`Uploaded to: ${historicalPath}`);

    // Make files publicly readable
    await latestFile.makePublic();
    await historicalFile.makePublic();
  }
}
