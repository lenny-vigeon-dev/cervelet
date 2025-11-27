import type { Timestamp } from 'firebase-admin/firestore';

/**
 * Canvas document structure
 * Collection: canvases
 * Document ID: Auto-generated or custom (e.g., 'main-canvas')
 */
export interface Canvas {
  id: string;
  width: number;
  height: number;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalPixels: number;
}

/**
 * Pixel document structure
 * Collection: pixels
 * Document ID: {canvasId}_{x}_{y} (e.g., 'main-canvas_100_250')
 */
export interface Pixel {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string | null;
  updatedAt: Timestamp;
}

/**
 * User roles enum
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * User document structure
 * Collection: users
 * Document ID: Auto-generated or custom user ID
 */
export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  role: UserRole;
  lastPixelPlaced: Timestamp | null;
  totalPixelsPlaced: number;
  createdAt: Timestamp;
}

/**
 * Pixel history document structure
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
 * Input types for creating documents (without auto-generated fields)
 */
export interface CreateCanvasInput {
  id?: string;
  width: number;
  height: number;
  version?: number;
}

export interface CreatePixelInput {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string | null;
}

export interface CreateUserInput {
  id?: string;
  username: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface CreatePixelHistoryInput {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string | null;
}

/**
 * Update types (partial updates)
 */
export interface UpdateCanvasInput {
  width?: number;
  height?: number;
  version?: number;
  totalPixels?: number;
}

export interface UpdatePixelInput {
  color?: number;
  userId?: string | null;
}

export interface UpdateUserInput {
  username?: string;
  avatarUrl?: string;
  role?: UserRole;
  lastPixelPlaced?: Timestamp | null;
  totalPixelsPlaced?: number;
}

/**
 * Query filter types
 */
export interface PixelQuery {
  canvasId?: string;
  userId?: string;
  limit?: number;
  orderBy?: 'updatedAt';
  orderDirection?: 'asc' | 'desc';
  startAfter?: any;
}

export interface PixelHistoryQuery {
  canvasId?: string;
  x?: number;
  y?: number;
  userId?: string;
  limit?: number;
  orderBy?: 'createdAt';
  orderDirection?: 'asc' | 'desc';
  startAfter?: any;
}

/**
 * Collection names (for consistency)
 */
export const COLLECTIONS = {
  CANVASES: 'canvases',
  PIXELS: 'pixels',
  USERS: 'users',
  PIXEL_HISTORY: 'pixelHistory',
} as const;

/**
 * Helper type for Firestore document snapshots
 */
export type FirestoreDocument<T> = T & {
  _id: string;
  _ref: any;
};
