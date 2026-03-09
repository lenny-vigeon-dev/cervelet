import { Timestamp } from '@google-cloud/firestore';

/**
 * Thrown when a pixel write is rejected due to rate-limiting.
 * Use `instanceof CooldownError` instead of string matching on error messages.
 */
export class CooldownError extends Error {
  readonly remainingMs: number;

  constructor(remainingMs: number) {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    super(`Cooldown active. Wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}.`);
    this.name = 'CooldownError';
    this.remainingMs = remainingMs;
  }
}

/**
 * Pub/Sub Contract - Incoming message structure
 */
export interface PixelPayload {
  userId: string;
  username: string;
  avatarUrl?: string;
  x: number;
  y: number;
  color: number;
  // Optional when triggered outside of Discord interactions
  interactionToken?: string;
  applicationId?: string;
}

/**
 * Firestore document for 'users' collection
 * Document ID = {userId}
 */
export interface UserDoc {
  id: string;
  username: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  lastPixelPlaced: Timestamp;
  totalPixelsPlaced: number;
  createdAt: Timestamp;
}

/**
 * Firestore document for 'pixels' collection
 * Document ID = {canvasId}_{x}_{y}
 */
export interface PixelDoc {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string;
  username: string;
  updatedAt: Timestamp;
}

/**
 * Firestore document for 'pixelHistory' collection (append-only audit trail)
 * Document ID = auto-generated
 */
export interface PixelHistoryDoc {
  canvasId: string;
  x: number;
  y: number;
  color: number;
  userId: string;
  username: string;
  createdAt: Timestamp;
}

/**
 * Pub/Sub envelope received by Cloud Run
 */
export interface PubSubMessage {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}
