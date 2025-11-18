'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasSnapshot } from "@/types/canvas";
import { ToolbarWrapper } from "./toolbar-wrapper";

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
  // Canva
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensions = useMemo(() => {
    if (snapshot) {
      return { width: snapshot.width, height: snapshot.height };
    }
    return { width: 256, height: 256 };
  }, [snapshot]);
  
  // Selected pixel
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [drawnPixels, setDrawnPixels] = useState<Array<{ x: number; y: number; color: string }>>([]);

  // Zoom
  const [zoom, setZoom] = useState(1);
  const [[originX, originY], setOrigin] = useState<[number, number]>([0, 0]);
  const [disablePageZoom, setDisablePageZoom] = useState(false);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;

  // Pan (drag to move)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
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
    } else {
      snapshot.pixels.forEach((pixel) => {
        context.fillStyle = pixel.color;
        context.fillRect(pixel.x, pixel.y, 1, 1);
      });
    }

    drawnPixels.forEach((pixel) => {
      context.fillStyle = pixel.color;
      context.fillRect(pixel.x, pixel.y, 1, 1);
    });

    if (selectedPixel) {
      context.fillStyle = "rgba(255, 0, 0, 0.5)";
      context.fillRect(selectedPixel.x, selectedPixel.y, 1, 1);
    }
  }, [snapshot, dimensions, selectedPixel, drawnPixels]);

   useEffect(() => {
    const handler = (event: WheelEvent) => {
      if (disablePageZoom && event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, [disablePageZoom]);


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
  }

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

    setOrigin([(mouseX / rect.width) * 100, (mouseY / rect.height) * 100]);
    setZoom((z) => {
      const zoomFactor = z > 1 ? 0.2 : 0.1;
      const newZoom = z + (event.deltaY > 0 ? -zoomFactor : zoomFactor);
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    });
  };

  const drawPixel = (pixel: { x: number; y: number }) => {
    if (!selectedColor) {
      console.log("No color selected");
      return;
    }

    setDrawnPixels([...drawnPixels, { x: pixel.x, y: pixel.y, color: selectedColor }]);
    setSelectedPixel(null);
    setSelectedColor(null);
  }

  return (
    <div className={`w-full rounded-3xl border border-brand/20 bg-canvas-surface overflow-hidden select-none`}>
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
