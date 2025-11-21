'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasSnapshot } from "@/types/canvas";
import { ToolbarWrapper } from "./toolbar-wrapper";
import { useRealtimeCanvas } from "@/hooks/use-realtime-canvas";

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
  const MIN_ZOOM = 0.5; // Permet de dé-zoomer sans que l'image disparaisse
  const MAX_ZOOM = 5;

  // Pan (drag to move)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
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
    context.fillStyle = "#050404";
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
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    
    
    setSelectedPixel({ x, y });
    console.log(`Pixel clicked: (${x}, ${y})`);
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

    setPanOffset({
      x: panOffset.x + deltaX,
      y: panOffset.y + deltaY,
    });

    setPanStart({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setPanStart(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left);
    const mouseY = (event.clientY - rect.top);

    setZoom((prevZoom) => {
      // Zoom factor très progressif
      const zoomFactor = 0.05;
      const newZoom = prevZoom + (event.deltaY > 0 ? -zoomFactor : zoomFactor);
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));

      // Si on est au zoom minimum, centrer le canvas
      if (clampedZoom === MIN_ZOOM) {
        setOrigin([50, 50]); // Centre
        setPanOffset({ x: 0, y: 0 }); // Reset pan
      } else {
        // Sinon, zoom sur la position de la souris
        setOrigin([(mouseX / rect.width) * 100, (mouseY / rect.height) * 100]);
      }

      return clampedZoom;
    });
  };

  const drawPixel = (pixel: { x: number; y: number }) => {
    if (!selectedColor) {
      return;
    }

    setDrawnPixels([...drawnPixels, { x: pixel.x, y: pixel.y, color: selectedColor }]);
    setSelectedPixel(null);
    setSelectedColor(null);
  };

  return (
    <div className={`w-full rounded-3xl border border-brand/20 bg-canvas-surface overflow-hidden select-none relative`}>
      {/* Real-time status indicator - Bottom right to not block close button */}
      {enableRealtime && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-brand/30">
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

      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-4 z-20 bg-red-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-red-500/50">
          <span className="text-xs text-red-200">Error: {error.message}</span>
        </div>
      )}

      {selectedPixel && (
        <div className="flex">
          <div className="fixed top-0 left-0 z-10 w-full items-center flex justify-center flex-col">
            <ToolbarWrapper onSelectColor={setSelectedColor} />
          </div>
          {selectedColor && (
          <div className="fixed bottom-0 left-0 z-10 w-full items-center flex justify-center pb-8">
            <div className="flex gap-4">
              <button
                className="bg-brand hover:bg-brand/80 text-white font-semibold py-3 px-8 rounded-xl border border-brand/40 shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95"
                onClick={() => drawPixel(selectedPixel)}
              >
                Dessiner
              </button>
              <button
                className="bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-300 hover:text-white font-semibold py-3 px-8 rounded-xl border border-zinc-700 transition-all hover:scale-105 active:scale-95"
                onClick={() => setSelectedPixel(null)}
              >
                Annuler
              </button>
            </div>
          </div>
          ) }
        </div>
      )}
      <div className={`${className ?? ""} justify-center flex`}>
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
          onWheel={handleWheel}
          style={{
            width: dimensions.width * scale,
            height: dimensions.height * scale,
            imageRendering: "pixelated",
            transform: `scale(${zoom})`, transformOrigin: `${originX}% ${originY}%`
          }}
          className="rounded-2xl border border-brand/25 bg-black shadow-lg shadow-brand/20"
          aria-label="Collaborative pixel canvas"
        />
      </div>
      </div>
    </div>
  );
}

export default PixelCanvas;
