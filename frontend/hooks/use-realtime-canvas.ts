/**
 * useRealtimeCanvas Hook
 *
 * Hybrid canvas loading strategy:
 * 1. Load initial snapshot from Cloud Storage (fast initial load)
 * 2. Subscribe to real-time pixel updates from Firestore (live updates)
 * 3. Periodically refresh snapshot to prevent drift
 *
 * This approach minimizes Firestore reads while providing real-time updates.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getFirestoreDb, COLLECTIONS } from '@/lib/firebase/config';
import { loadCanvasSnapshotImage, getSnapshotUrl } from '@/lib/canvas-snapshot';
import type { CanvasPixel } from '@/types/canvas';

interface RealtimeCanvasState {
  /** Canvas image from Cloud Storage snapshot */
  snapshotImage: HTMLImageElement | null;
  /** Real-time pixel updates since snapshot was loaded */
  realtimePixels: CanvasPixel[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether real-time listener is active */
  isListening: boolean;
}

interface UseRealtimeCanvasOptions {
  /** Canvas ID to listen to (default: 'main-canvas') */
  canvasId?: string;
  /** Whether to enable real-time updates (default: true) */
  enableRealtime?: boolean;
  /** Snapshot refresh interval in ms (default: 60000 = 1 minute) */
  refreshInterval?: number;
  /** Whether to load snapshot on mount (default: true) */
  autoLoadSnapshot?: boolean;
}

/**
 * Hook for managing canvas with real-time updates
 *
 * @param options - Configuration options
 * @returns Canvas state and control functions
 */
export function useRealtimeCanvas(options: UseRealtimeCanvasOptions = {}) {
  const {
    canvasId = 'main-canvas',
    enableRealtime = true,
    refreshInterval = 60000,
    autoLoadSnapshot = true,
  } = options;

  const [state, setState] = useState<RealtimeCanvasState>({
    snapshotImage: null,
    realtimePixels: [],
    isLoading: autoLoadSnapshot,
    error: null,
    isListening: false,
  });

  // Track when snapshot was loaded to filter Firestore updates
  const snapshotLoadedAtRef = useRef<Date | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Load canvas snapshot from Cloud Storage
   */
  const loadSnapshotImage = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const image = await loadCanvasSnapshotImage();
      const loadedAt = new Date();

      setState((prev) => ({
        ...prev,
        snapshotImage: image,
        isLoading: false,
        // Clear real-time pixels when snapshot refreshes
        realtimePixels: [],
      }));

      snapshotLoadedAtRef.current = loadedAt;

      console.log('✅ Canvas snapshot loaded:', {
        url: getSnapshotUrl(),
        width: image.width,
        height: image.height,
        loadedAt: loadedAt.toISOString(),
      });
    } catch (error) {
      console.error('❌ Failed to load canvas snapshot:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load snapshot'),
      }));
    }
  }, []);

  /**
   * Subscribe to real-time pixel updates from Firestore
   */
  const subscribeToPixelUpdates = useCallback(() => {
    if (!enableRealtime) {
      return;
    }

    try {
      const db = getFirestoreDb();
      const pixelsCollection = collection(db, COLLECTIONS.CANVAS);

      // Only listen to pixels updated AFTER snapshot was loaded
      const snapshotTime = snapshotLoadedAtRef.current;

      let q = query(
        pixelsCollection,
        orderBy('lastUpdatedAt', 'desc')
      );

      // If we have a snapshot timestamp, only get pixels after that
      if (snapshotTime) {
        const firestoreTimestamp = Timestamp.fromDate(snapshotTime);
        q = query(
          pixelsCollection,
          where('lastUpdatedAt', '>', firestoreTimestamp),
          orderBy('lastUpdatedAt', 'desc')
        );
      }

      console.log('🔴 Subscribing to real-time pixel updates...', {
        canvasId,
        sinceSnapshot: snapshotTime?.toISOString() || 'all',
      });

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setState((prev) => ({ ...prev, isListening: true }));

          const changes = snapshot.docChanges();

          if (changes.length > 0) {
            console.log(`🎨 Received ${changes.length} pixel update(s)`);

            changes.forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                const pixelId = change.doc.id;

                // Parse pixel coordinates from document ID (format: "canvasId_x_y")
                const parts = pixelId.split('_');
                const x = Number(parts[1]);
                const y = Number(parts[2]);

                // Convert color integer to hex string
                const colorInt = data.color as number;
                const colorHex = `#${colorInt.toString(16).padStart(6, '0')}` as `#${string}`;

                const pixel: CanvasPixel = {
                  x,
                  y,
                  color: colorHex,
                  authorId: data.userId || 'unknown',
                  updatedAt: data.lastUpdatedAt?.toDate().toISOString() || new Date().toISOString(),
                };

                setState((prev) => {
                  // Remove existing pixel at this position and add new one
                  const filtered = prev.realtimePixels.filter(
                    (p) => !(p.x === pixel.x && p.y === pixel.y)
                  );
                  return {
                    ...prev,
                    realtimePixels: [pixel, ...filtered],
                  };
                });
              }
            });
          }
        },
        (error) => {
          console.error('❌ Firestore snapshot error:', error);
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error : new Error('Firestore subscription failed'),
            isListening: false,
          }));
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('❌ Failed to subscribe to pixel updates:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to subscribe'),
      }));
    }
  }, [canvasId, enableRealtime]);

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      console.log('🔴 Unsubscribing from pixel updates');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      setState((prev) => ({ ...prev, isListening: false }));
    }
  }, []);

  // Load snapshot on mount
  useEffect(() => {
    if (autoLoadSnapshot) {
      loadSnapshotImage();
    }
  }, [autoLoadSnapshot, loadSnapshotImage]);

  // Subscribe to real-time updates after snapshot loads
  useEffect(() => {
    if (state.snapshotImage && enableRealtime) {
      subscribeToPixelUpdates();
    }

    return () => {
      unsubscribe();
    };
  }, [state.snapshotImage, enableRealtime, subscribeToPixelUpdates, unsubscribe]);

  // Periodic snapshot refresh
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      console.log('🔄 Refreshing canvas snapshot...');
      loadSnapshotImage();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshInterval, loadSnapshotImage]);

  return {
    ...state,
    /** Manually reload snapshot */
    refreshSnapshot: loadSnapshotImage,
    /** Manually unsubscribe from updates */
    disconnect: unsubscribe,
  };
}
