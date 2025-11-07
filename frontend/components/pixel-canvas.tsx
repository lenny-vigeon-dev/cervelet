'use client';

import { useEffect, useMemo, useRef } from "react";
import type { CanvasSnapshot } from "@/types/canvas";

export interface PixelCanvasProps {
  snapshot?: CanvasSnapshot;
  scale?: number;
  className?: string;
}

/**
 * PixelCanvas is the main drawing surface. It currently renders a blank grid,
 * ready to be connected to live data or drawing interactions.
 */
export function PixelCanvas({
  snapshot,
  scale = 8,
  className,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensions = useMemo(() => {
    if (snapshot) {
      return { width: snapshot.width, height: snapshot.height };
    }
    return { width: 256, height: 256 };
  }, [snapshot]);

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

    context.fillStyle = "#050404";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!snapshot) {
      // Draw placeholder grid to help visualise the canvas.
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

    snapshot.pixels.forEach((pixel) => {
      context.fillStyle = pixel.color;
      context.fillRect(pixel.x, pixel.y, 1, 1);
    });
  }, [snapshot, dimensions]);

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
    </div>
  );
}

export default PixelCanvas;
