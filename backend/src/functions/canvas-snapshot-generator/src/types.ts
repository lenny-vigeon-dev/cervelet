import type { Timestamp } from '@google-cloud/firestore';

export interface Canvas {
  id: string;
  width: number;
  height: number;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalPixels: number;
}

export interface Pixel {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string | null;
  updatedAt: Timestamp;
}

export interface SnapshotMetadata {
  canvasId: string;
  timestamp: string;
  width: number;
  height: number;
  totalPixels: number;
  version: number;
}
