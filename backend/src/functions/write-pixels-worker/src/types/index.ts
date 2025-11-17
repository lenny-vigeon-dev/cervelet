import { Timestamp } from '@google-cloud/firestore';

/**
 * Pub/Sub Contract - Incoming message structure
 */
export interface PixelPayload {
  userId: string;
  x: number;
  y: number;
  color: number;
  interactionToken: string;
  applicationId: string;
}

/**
 * Firestore document for 'users' collection
 * Document ID = {userId}
 */
export interface UserDoc {
  lastPixelAt: Timestamp;
}

/**
 * Firestore document for 'canvas' collection
 * Document ID = {x}_{y}
 */
export interface PixelDoc {
  color: number;
  userId: string;
  lastUpdatedAt: Timestamp;
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
