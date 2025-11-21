/**
 * Canvas Snapshot Loading from Cloud Storage
 *
 * This module provides optimized canvas loading by fetching pre-generated
 * snapshots from Cloud Storage instead of individual pixels from Firestore.
 *
 * Benefits:
 * - Much faster initial load (single image vs thousands of pixel documents)
 * - Lower costs (Cloud Storage bandwidth vs Firestore reads)
 * - Better caching with CDN
 */

const SNAPSHOT_URL = process.env.NEXT_PUBLIC_CANVAS_SNAPSHOT_URL ||
  'https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png';

/**
 * Load the latest canvas snapshot image from Cloud Storage
 *
 * @returns Promise that resolves with the loaded Image element
 * @throws Error if the image fails to load
 */
export async function loadCanvasSnapshotImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Add timestamp to prevent aggressive caching (snapshots update frequently)
    const cacheBuster = `?t=${Date.now()}`;
    img.src = SNAPSHOT_URL + cacheBuster;

    // Enable CORS for cross-origin images
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.warn('Failed to load canvas snapshot from Cloud Storage:', error);
      reject(new Error('Failed to load canvas snapshot'));
    };
  });
}

/**
 * Check if a canvas snapshot is available in Cloud Storage
 *
 * @returns Promise that resolves to true if snapshot exists, false otherwise
 */
export async function isSnapshotAvailable(): Promise<boolean> {
  try {
    const response = await fetch(SNAPSHOT_URL, {
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok;
  } catch (error) {
    console.warn('Snapshot availability check failed:', error);
    return false;
  }
}

/**
 * Get the URL of the latest canvas snapshot
 *
 * @returns The URL to the latest snapshot
 */
export function getSnapshotUrl(): string {
  return SNAPSHOT_URL;
}

/**
 * Canvas rendering strategy:
 * 1. Load snapshot image from Cloud Storage (fast, shows historical state)
 * 2. Listen to real-time stream for updates (overlay new pixels)
 * 3. Periodically refresh snapshot to prevent drift
 */
export interface CanvasLoadingStrategy {
  useSnapshot: boolean;
  fallbackToPixels: boolean;
  refreshInterval?: number; // milliseconds
}

export const DEFAULT_STRATEGY: CanvasLoadingStrategy = {
  useSnapshot: true,
  fallbackToPixels: true,
  refreshInterval: 60000, // Refresh snapshot every 60 seconds
};
