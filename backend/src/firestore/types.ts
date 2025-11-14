/**
 * Firestore Data Model Type Definitions
 *
 * These types represent the document structure for each collection
 * in the Firestore database.
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Canvas Document
 * Collection: canvases
 * Document ID: Auto-generated or custom (e.g., "main-canvas")
 */
export interface Canvas {
  id: string;
  width: number;
  height: number;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalPixels: number; // Denormalized count
}

/**
 * Pixel Document
 * Collection: pixels
 * Document ID: {canvasId}_{x}_{y} (e.g., "main-canvas_100_250")
 */
export interface Pixel {
  canvasId: string;
  x: number;
  y: number;
  color: number; // Integer representation of color
  userId: string | null;
  updatedAt: Timestamp;
}

/**
 * User Document
 * Collection: users
 * Document ID: Auto-generated or custom user ID
 */
export interface User {
  id: string;
  username: string;
  lastPixelPlaced: Timestamp | null;
  totalPixelsPlaced: number;
  createdAt: Timestamp;
}

/**
 * Pixel History Document (Audit Trail)
 * Collection: pixelHistory
 * Document ID: Auto-generated
 */
export interface PixelHistory {
  id: string;
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string | null;
  createdAt: Timestamp;
}

/**
 * DTOs for creating/updating documents
 */

export interface CreateCanvasDto {
  width: number;
  height: number;
  version?: number;
}

export interface CreatePixelDto {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId?: string | null;
}

export interface CreateUserDto {
  username: string;
}

export interface UpdatePixelDto {
  color: number;
  userId?: string | null;
}

export interface UpdateUserDto {
  lastPixelPlaced?: Timestamp;
  totalPixelsPlaced?: number;
}
