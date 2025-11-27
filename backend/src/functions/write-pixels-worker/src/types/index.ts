import { Timestamp } from '@google-cloud/firestore';

/**
 * Pub/Sub Contract - Incoming message structure
 */
export interface PixelPayload {
  userId: string;
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
  lastPixelPlaced: Timestamp;
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
  updatedAt: Timestamp;
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
