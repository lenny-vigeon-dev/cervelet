/**
 * Firestore Service
 *
 * Provides a wrapper around Firebase Admin SDK for Firestore operations.
 *
 * For Firestore document type definitions, import from:
 *   import { Canvas, Pixel, User, PixelHistory, UserRole } from '../types';
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { initializeApp, getApps, getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';
import type {
  Firestore,
  Transaction,
  WriteBatch,
  Query,
  QuerySnapshot,
} from 'firebase-admin/firestore';

@Injectable()
export class FirestoreService implements OnModuleInit, OnModuleDestroy {
  private firestore!: Firestore;
  private app!: App;

  onModuleInit(): void {
    // Initialize Firebase Admin SDK
    // Uses Application Default Credentials (ADC) in production
    // For local development, set GOOGLE_APPLICATION_CREDENTIALS env variable
    const apps = getApps();
    if (apps.length === 0) {
      this.app = initializeApp({
        projectId: process.env.GCP_PROJECT_ID || 'serverless-tek89',
      });
    } else {
      this.app = getApp();
    }

    this.firestore = getFirestore(this.app);

    // Configure Firestore settings
    this.firestore.settings({
      ignoreUndefinedProperties: true, // Ignore undefined values in documents
    });

    console.log('Firestore connection initialized');
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up Firebase Admin SDK
    if (this.app) {
      await deleteApp(this.app);
      console.log('Firestore connection closed');
    }
  }

  /**
   * Get the Firestore instance
   * @returns Firestore instance for database operations
   */
  getFirestore(): Firestore {
    return this.firestore;
  }

  /**
   * Get a reference to a collection
   * @param collectionName - Name of the collection
   * @returns CollectionReference
   */
  collection(collectionName: string) {
    return this.firestore.collection(collectionName);
  }

  /**
   * Get a reference to a document
   * @param collectionName - Name of the collection
   * @param documentId - ID of the document
   * @returns DocumentReference
   */
  doc(collectionName: string, documentId: string) {
    return this.firestore.collection(collectionName).doc(documentId);
  }

  /**
   * Run a transaction
   * @param updateFunction - Function to execute in the transaction
   * @returns Promise with transaction result
   */
  runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    return this.firestore.runTransaction(updateFunction);
  }

  /**
   * Create a batch write
   * @returns WriteBatch instance
   */
  batch(): WriteBatch {
    return this.firestore.batch();
  }

  /**
   * Get server timestamp
   * @returns FieldValue for server timestamp
   */
  timestamp(): FieldValue {
    return FieldValue.serverTimestamp();
  }

  /**
   * Clean all collections (development only)
   * WARNING: This will delete all data in the database
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Database cleanup is disabled in production');
      return;
    }

    console.log('Cleaning Firestore database...');

    const collections = ['canvases', 'pixels', 'users', 'pixelHistory'];

    for (const collectionName of collections) {
      await this.deleteCollection(collectionName);
    }

    console.log('Database cleaned successfully');
  }

  /**
   * Delete all documents in a collection
   * @param collectionName - Name of the collection to delete
   * @param batchSize - Number of documents to delete per batch
   */
  private async deleteCollection(
    collectionName: string,
    batchSize = 500,
  ): Promise<void> {
    const collectionRef = this.firestore.collection(collectionName);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
      void this.deleteQueryBatch(query, resolve, reject);
    });
  }

  /**
   * Helper function to delete documents in batches
   */
  private async deleteQueryBatch(
    query: Query,
    resolve: () => void,
    reject: (error: Error) => void,
  ): Promise<void> {
    try {
      const snapshot: QuerySnapshot = await query.get();

      if (snapshot.size === 0) {
        resolve();
        return;
      }

      const batch: WriteBatch = this.firestore.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Recurse on the next batch
      process.nextTick(() => {
        void this.deleteQueryBatch(query, resolve, reject);
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Helper: Create a pixel document ID from coordinates
   * @param canvasId - Canvas ID
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Document ID in format: canvasId_x_y
   */
  static createPixelId(canvasId: string, x: number, y: number): string {
    return `${canvasId}_${x}_${y}`;
  }

  /**
   * Helper: Parse pixel coordinates from document ID
   * @param pixelId - Pixel document ID
   * @returns Object with canvasId, x, y
   */
  static parsePixelId(pixelId: string): {
    canvasId: string;
    x: number;
    y: number;
  } {
    const parts = pixelId.split('_');
    if (parts.length !== 3) {
      throw new Error(`Invalid pixel ID format: ${pixelId}`);
    }
    return {
      canvasId: parts[0],
      x: parseInt(parts[1], 10),
      y: parseInt(parts[2], 10),
    };
  }
}
