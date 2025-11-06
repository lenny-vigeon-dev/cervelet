export type PixelColor = `#${string}`;

export interface PixelCoordinate {
  x: number;
  y: number;
}

export interface CanvasPixel extends PixelCoordinate {
  color: PixelColor;
  authorId: string;
  updatedAt: string;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface CanvasSnapshot extends CanvasDimensions {
  name: string;
  version: number;
  lastUpdatedAt: string;
  pixels: CanvasPixel[];
}

export interface CanvasSummary {
  activeUsers: number;
  totalPixelsPlaced: number;
  cooldownSeconds: number;
}

export type CanvasEventType = "pixel" | "reset" | "system";

export interface CanvasStreamEvent {
  type: CanvasEventType;
  payload: unknown;
  emittedAt: string;
}
