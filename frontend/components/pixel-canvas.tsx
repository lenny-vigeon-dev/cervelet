'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasSnapshot } from "@/types/canvas";
import { ToolbarWrapper } from "./toolbar-wrapper";
import { useRealtimeCanvas } from "@/hooks/use-realtime-canvas";
import { useSession } from "@/hooks/use-session";
import { writePixel } from "@/lib/firebase/write-pixel";
import { useCooldown } from "@/hooks/use-cooldown";

export interface PixelCanvasProps {
  snapshot?: CanvasSnapshot;
  scale?: number;
  className?: string;
  /** Enable real-time updates from Firestore (default: true) */
  enableRealtime?: boolean;
  /** Canvas ID to display (default: 'main-canvas') */
  canvasId?: string;
}

/**
 * PixelCanvas is the main drawing surface with real-time collaboration.
 *
 * Features:
 * - Loads initial canvas from Cloud Storage snapshot (fast)
 * - Real-time pixel updates via Firestore (live collaboration)
 * - Zoom and pan controls
 * - Pixel selection and drawing
 */
export function PixelCanvas({
  snapshot,
  scale = 1, // Scale réduit pour les grands canvas (1000x1000)
  className,
  enableRealtime = true,
  canvasId = 'main-canvas',
}: PixelCanvasProps) {
  // User authentication
  const { session } = useSession();

  // Cooldown tracking
  const { isOnCooldown, remainingFormatted, startCooldown } = useCooldown();

  // Real-time canvas hook
  const {
    snapshotImage,
    realtimePixels,
    isLoading,
    isListening,
    error
  } = useRealtimeCanvas({
    canvasId,
    enableRealtime,
    refreshInterval: 60000, // Refresh every 60 seconds
  });

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine dimensions from snapshot image or fallback
  const dimensions = useMemo(() => {
    if (snapshotImage) {
      return { width: snapshotImage.width, height: snapshotImage.height };
    }
    if (snapshot) {
      return { width: snapshot.width, height: snapshot.height };
    }
    return { width: 256, height: 256 };
  }, [snapshotImage, snapshot]);
  
  // Selected pixel
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [drawnPixels, setDrawnPixels] = useState<Array<{ x: number; y: number; color: string }>>([]);

  // Zoom
  const [zoom, setZoom] = useState(1);
  const [[originX, originY], setOrigin] = useState<[number, number]>([50, 50]);
  const [minZoom, setMinZoom] = useState(0.1);
  const MAX_ZOOM = 20; // Permet de zoomer très près pour placer les pixels précisément

  // Pan (drag to move)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track if we have performed the initial fit for the current dimensions
  const [hasFitted, setHasFitted] = useState(false);

  // Reset hasFitted when dimensions change
  useEffect(() => {
    setHasFitted(false);
  }, [dimensions.width, dimensions.height]);

  // Calculate min zoom to fit container
  useEffect(() => {
    if (!containerRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const updateMinZoom = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
      const canvasWidth = dimensions.width * scale;
      const canvasHeight = dimensions.height * scale;

      // Calculate the zoom level needed to fit the canvas entirely in the container
      const fitZoom = Math.min(
        containerWidth / canvasWidth,
        containerHeight / canvasHeight
      );
      
      // Ensure minZoom is not larger than MAX_ZOOM
      const newMinZoom = Math.min(fitZoom, MAX_ZOOM);
      
      setMinZoom(newMinZoom);
      
      if (!hasFitted) {
        setZoom(newMinZoom);
        setPanOffset({ x: 0, y: 0 });
        setHasFitted(true);
      } else {
        // If current zoom is less than new minZoom, update it
        setZoom(z => Math.max(z, newMinZoom));
      }
    };

    updateMinZoom();
    
    const observer = new ResizeObserver(updateMinZoom);
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [dimensions, scale, hasFitted]);

  // Refs for accessing state in event handlers without re-binding
  const zoomRef = useRef(zoom);
  const panOffsetRef = useRef(panOffset);

  useEffect(() => {
    zoomRef.current = zoom;
    panOffsetRef.current = panOffset;
  }, [zoom, panOffset]);

  // Helper to clamp offset
  const clampOffset = (offset: {x: number, y: number}, zoomLevel: number) => {
    const container = containerRef.current;
    if (!container) return offset;
    
    const containerRect = container.getBoundingClientRect();
    const canvasWidth = dimensions.width * scale * zoomLevel;
    const canvasHeight = dimensions.height * scale * zoomLevel;
    
    // If canvas is smaller than container, center it (offset 0)
    // If canvas is larger, allow panning but keep edges within container
    const maxOffsetX = Math.max(0, (canvasWidth - containerRect.width) / 2);
    const maxOffsetY = Math.max(0, (canvasHeight - containerRect.height) / 2);
    
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y))
    };
  };
  
  // Render canvas: snapshot image + real-time pixels + local drawings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    // Clear canvas
    context.fillStyle = "#1b1b1b";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw snapshot image from Cloud Storage (base layer)
    if (snapshotImage) {
      context.drawImage(snapshotImage, 0, 0);
    } else if (snapshot) {
      // Fallback to legacy snapshot format
      snapshot.pixels.forEach((pixel) => {
        context.fillStyle = pixel.color;
        context.fillRect(pixel.x, pixel.y, 1, 1);
      });
    } else {
      // No snapshot: draw grid for empty canvas
      context.strokeStyle = "rgba(255, 163, 26, 0.08)";
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
    }

    // 2. Draw real-time pixels (overlay on top of snapshot)
    realtimePixels.forEach((pixel) => {
      context.fillStyle = pixel.color;
      context.fillRect(pixel.x, pixel.y, 1, 1);
    });

    // 3. Draw local pixels (not yet synced to server)
    drawnPixels.forEach((pixel) => {
      context.fillStyle = pixel.color;
      context.fillRect(pixel.x, pixel.y, 1, 1);
    });

    // 4. Draw selection highlight
    if (selectedPixel) {
      context.fillStyle = "rgba(255, 0, 0, 0.5)";
      context.fillRect(selectedPixel.x, selectedPixel.y, 1, 1);
    }
  }, [snapshotImage, snapshot, dimensions, realtimePixels, drawnPixels, selectedPixel]);


  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    // Get click position relative to canvas element
    // rect includes the scale transform and pan offset
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Calculate normalized coordinates (0 to 1)
    // Since rect is the bounding box of the scaled canvas, 
    // clickX / rect.width gives the correct relative position
    const normalizedX = clickX / rect.width;
    const normalizedY = clickY / rect.height;

    // Convert to pixel coordinates
    const x = Math.floor(normalizedX * canvas.width);
    const y = Math.floor(normalizedY * canvas.height);

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(canvas.width - 1, x));
    const clampedY = Math.max(0, Math.min(canvas.height - 1, y));

    setSelectedPixel({ x: clampedX, y: clampedY });
    console.log(`Pixel clicked: (${clampedX}, ${clampedY})`);
    setIsPanning(false);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setPanStart({ x: event.clientX, y: event.clientY });
    setIsPanning(false);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!panStart) {
      return;
    }

    const deltaX = event.clientX - panStart.x;
    const deltaY = event.clientY - panStart.y;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setIsPanning(true);
    }

    const newOffset = {
      x: panOffset.x + deltaX,
      y: panOffset.y + deltaY,
    };

    setPanOffset(clampOffset(newOffset, zoom));

    setPanStart({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setPanStart(null);
  };

  // Attach wheel event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Calculate mouse position relative to the center of the canvas
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseXFromCenter = event.clientX - centerX;
      const mouseYFromCenter = event.clientY - centerY;

      // Multiplicative zoom for smoother experience
      const ZOOM_SPEED = 1.05;
      const direction = Math.sign(event.deltaY); // 1 for down (out), -1 for up (in)
      
      // If deltaY is 0, do nothing
      if (direction === 0) return;

      // Use refs to get latest state without re-binding listener
      const currentZoom = zoomRef.current;
      const currentPanOffset = panOffsetRef.current;

      // Zoom out (positive delta) -> divide. Zoom in (negative delta) -> multiply.
      const newZoomRaw = direction > 0 ? currentZoom / ZOOM_SPEED : currentZoom * ZOOM_SPEED;
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(minZoom, newZoomRaw));

      // Si on est au zoom minimum, centrer le canvas et reset tout
      // Use a small epsilon for float comparison
      if (Math.abs(clampedZoom - minZoom) < 0.001) {
        setOrigin([50, 50]);
        setPanOffset({ x: 0, y: 0 });
        setZoom(minZoom);
        return;
      }

      // Calculer le ratio de zoom
      const zoomRatio = clampedZoom / currentZoom;

      // Ajuster le pan offset pour zoomer vers la souris
      const targetOffset = {
        x: currentPanOffset.x + mouseXFromCenter * (1 - zoomRatio),
        y: currentPanOffset.y + mouseYFromCenter * (1 - zoomRatio),
      };

      setPanOffset(clampOffset(targetOffset, clampedZoom));
      setZoom(clampedZoom);
    };

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [minZoom, MAX_ZOOM, dimensions, scale]); // Added dimensions and scale to deps as they are used in clampOffset

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  const drawPixel = async (pixel: { x: number; y: number }) => {
    if (!selectedColor) {
      return;
    }

    if (!session.isAuthenticated) {
      setDrawError('You must be logged in with Discord to place pixels');
      return;
    }

    if (isOnCooldown) {
      setDrawError(`You can place another pixel in ${remainingFormatted}`);
      return;
    }

    // Convert hex color to integer
    const colorInt = parseInt(selectedColor.replace('#', ''), 16);

    // Optimistic update: show pixel immediately
    const optimisticPixel = { x: pixel.x, y: pixel.y, color: selectedColor };
    setDrawnPixels((prev) => [...prev, optimisticPixel]);
    setSelectedPixel(null);
    setSelectedColor(null);
    setIsDrawing(true);
    setDrawError(null);

    try {
      // Call serverless worker (handles cooldown + write)
      const result = await writePixel({
        x: pixel.x,
        y: pixel.y,
        color: colorInt,
      });

      if (!result.success) {
        // Revert optimistic update on error
        setDrawnPixels((prev) => prev.filter(p => p.x !== pixel.x || p.y !== pixel.y));
        setDrawError(result.error || 'Failed to place pixel');

        // Check if error is cooldown-related and extract remaining time
        if (result.error?.includes('Cooldown active')) {
          // Parse remaining time from error message (format: "...Wait X minutes (Ys).")
          const match = result.error.match(/\((\d+)s\)/);
          if (match) {
            const remainingSeconds = parseInt(match[1], 10);
            startCooldown(remainingSeconds * 1000);
          }
        }
      } else {
        console.log('✅ Pixel placed successfully!');
        // Start 5-minute cooldown (300000ms)
        startCooldown(300000);
      }
    } catch (error) {
      // Revert optimistic update on error
      setDrawnPixels((prev) => prev.filter(p => p.x !== pixel.x || p.y !== pixel.y));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDrawError(errorMessage);

      // Check if error is cooldown-related
      if (errorMessage.includes('Cooldown active')) {
        const match = errorMessage.match(/\((\d+)s\)/);
        if (match) {
          const remainingSeconds = parseInt(match[1], 10);
          startCooldown(remainingSeconds * 1000);
        }
      }
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <div ref={containerRef} className={`${className ?? ""} w-full border border-brand/20 bg-canvas-surface overflow-hidden select-none relative flex items-center justify-center`}>
      {/* Real-time status indicator - Bottom right to not block close button */}
      {enableRealtime && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-surface/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-brand/30">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-zinc-300">
            {isLoading ? 'Loading...' : isListening ? 'Live' : 'Offline'}
          </span>
          {realtimePixels.length > 0 && (
            <span className="text-xs text-brand">
              +{realtimePixels.length}
            </span>
          )}
        </div>
      )}

      {/* Cooldown display */}
      {isOnCooldown && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-blue-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-500/50">
          <span className="text-xs text-blue-200">
            Next pixel in: <span className="font-bold">{remainingFormatted}</span>
          </span>
        </div>
      )}

      {/* Error display */}
      {(error || drawError) && !isOnCooldown && (
        <div className="absolute top-4 left-4 z-20 bg-red-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-red-500/50">
          <span className="text-xs text-red-200">
            {drawError || (error && `Error: ${error.message}`)}
          </span>
        </div>
      )}

      {selectedPixel && (
        <div className="flex">
          <div className="fixed top-0 left-0 z-10 w-full items-center flex justify-center flex-col pointer-events-none">
            <div className="pointer-events-auto">
              <ToolbarWrapper 
                onSelectColor={setSelectedColor} 
                onClose={() => {
                  setSelectedPixel(null);
                  setSelectedColor(null);
                }}
              />
            </div>
          </div>
          {selectedColor && (
          <div className="fixed bottom-0 left-0 z-10 w-full items-center flex justify-center pb-8">
            <div className="flex gap-4">
              <button
                className="bg-brand hover:bg-brand/80 text-white font-semibold py-3 px-8 rounded-xl border border-brand/40 shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => drawPixel(selectedPixel)}
                disabled={isDrawing || !session.isAuthenticated || isOnCooldown}
                title={isOnCooldown ? `Cooldown: ${remainingFormatted}` : undefined}
              >
                {isDrawing ? 'Placement...' : isOnCooldown ? `Cooldown (${remainingFormatted})` : 'Dessiner'}
              </button>
              <button
                className="bg-surface/90 hover:bg-surface text-zinc-300 hover:text-white font-semibold py-3 px-8 rounded-xl border border-zinc-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                onClick={() => setSelectedPixel(null)}
                disabled={isDrawing}
              >
                Annuler
              </button>
            </div>
          </div>
          ) }
        </div>
      )}
      <div className={`flex items-center justify-center w-full h-full`}>
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          cursor: panStart ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            width: dimensions.width * scale,
            height: dimensions.height * scale,
            imageRendering: "pixelated",
            transform: `scale(${zoom})`, transformOrigin: `${originX}% ${originY}%`
          }}
          className="bg-canvas-bg outline-none"
          aria-label="Collaborative pixel canvas"
        />
      </div>
      </div>
    </div>
  );
}

export default PixelCanvas;
