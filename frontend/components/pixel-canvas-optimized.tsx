'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasSnapshot } from "@/types/canvas";
import { loadCanvasSnapshotImage } from "@/lib/canvas-snapshot";
import { subscribeToCanvasStream } from "@/lib/canvas";

export interface PixelCanvasOptimizedProps {
  snapshot?: CanvasSnapshot;
  scale?: number;
  className?: string;
  useCloudStorage?: boolean;
}

/**
 * Optimized PixelCanvas that loads from Cloud Storage snapshots
 *
 * Loading strategy:
 * 1. If useCloudStorage=true (default): Load snapshot image from Cloud Storage
 * 2. Overlay real-time pixel updates from the stream
 * 3. Fall back to rendering individual pixels if snapshot unavailable
 *
 * This approach dramatically improves performance for large canvases.
 */
export function PixelCanvasOptimized({
  snapshot,
  scale = 8,
  className,
  useCloudStorage = true,
}: PixelCanvasOptimizedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [snapshotError, setSnapshotError] = useState(false);

  const dimensions = useMemo(() => {
    if (snapshot) {
      return { width: snapshot.width, height: snapshot.height };
    }
    return { width: 256, height: 256 };
  }, [snapshot]);

  // Load initial snapshot from Cloud Storage
  useEffect(() => {
    if (!useCloudStorage || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Fill with dark background while loading
    context.fillStyle = "#050404";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Try to load snapshot image from Cloud Storage
    loadCanvasSnapshotImage()
      .then((img) => {
        // Draw the snapshot image onto the canvas
        context.drawImage(img, 0, 0, dimensions.width, dimensions.height);
        setSnapshotLoaded(true);
        setSnapshotError(false);
        console.log('Canvas snapshot loaded from Cloud Storage');
      })
      .catch((error) => {
        console.warn('Could not load snapshot, falling back to pixel rendering:', error);
        setSnapshotError(true);
        setSnapshotLoaded(false);
      });
  }, [useCloudStorage, dimensions]);

  // Render individual pixels if snapshot not available or disabled
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    // Skip if we're using Cloud Storage and it loaded successfully
    if (useCloudStorage && snapshotLoaded) {
      return;
    }

    // Only render pixels if Cloud Storage is disabled or failed
    if (!useCloudStorage || snapshotError) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      context.fillStyle = "#050404";
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (!snapshot) {
        // Draw placeholder grid
        context.strokeStyle = "rgba(255, 163, 33, 0.08)";
        for (let x = 0; x <= canvas.width; x += 16) {
          context.beginPath();
          context.moveTo(x + 0.5, 0);
          context.lineTo(x + 0.5, canvas.height);
          context.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 16) {
          context.beginPath();
          context.moveTo(0, y + 0.5);
          context.lineTo(canvas.width, y + 0.5);
          context.stroke();
        }
        return;
      }

      // Render individual pixels
      snapshot.pixels.forEach((pixel) => {
        context.fillStyle = pixel.color;
        context.fillRect(pixel.x, pixel.y, 1, 1);
      });
    }
  }, [snapshot, dimensions, useCloudStorage, snapshotLoaded, snapshotError]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    // Subscribe to canvas stream for real-time pixel updates
    const unsubscribe = subscribeToCanvasStream((event) => {
      if (event.type === 'pixel' && event.payload) {
        const pixel = event.payload as { x: number; y: number; color: string };
        // Update individual pixel in real-time
        context.fillStyle = pixel.color;
        context.fillRect(pixel.x, pixel.y, 1, 1);
      } else if (event.type === 'reset') {
        // Clear canvas on reset event
        context.fillStyle = "#050404";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div
      className={`relative isolate overflow-hidden rounded-3xl border border-brand/20 bg-canvas-surface shadow-surface ${className ?? ""}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-brand/15 via-transparent to-brand-strong/10 blur-3xl" />
      <div className="relative inset-0 flex items-center justify-center p-6">
        <canvas
          ref={canvasRef}
          style={{
            width: dimensions.width * scale,
            height: dimensions.height * scale,
            imageRendering: "pixelated",
          }}
          className="rounded-2xl border border-brand/25 bg-black shadow-lg shadow-brand/20"
          aria-label="Collaborative pixel canvas"
        />
      </div>
      {useCloudStorage && snapshotLoaded && (
        <div className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-brand-soft">
          Loaded from Cloud Storage
        </div>
      )}
    </div>
  );
}

export default PixelCanvasOptimized;
