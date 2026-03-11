/**
 * Pub/Sub message envelope from Cloud Run push subscriptions.
 */
export interface PubSubMessage {
  message: {
    data: string; // Base64-encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * Payload published by the proxy for non-draw Discord commands.
 * Must match DiscordCommandPayload in backend/src/discord/types.ts.
 */
export interface DiscordCommandPayload {
  command: 'snapshot' | 'session' | 'canvas' | 'clear' | 'resize' | 'lock' | 'unlock' | 'set_cooldown';
  action?: 'start' | 'pause' | 'reset';
  width?: number;
  height?: number;
  cooldownSeconds?: number;
  userId: string;
  username: string;
  isAdmin: boolean;
  interactionToken: string;
  applicationId: string;
  guildId?: string;
  channelId?: string;
}

/**
 * Firestore canvas metadata document.
 */
export interface CanvasDoc {
  width: number;
  height: number;
  version: number;
  status: 'active' | 'paused' | 'reset';
  totalPixels?: number;
  cooldownSeconds?: number;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}
