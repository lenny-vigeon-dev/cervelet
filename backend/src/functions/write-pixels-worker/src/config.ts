/**
 * Configuration and constants for the write-pixels-worker
 */

// Cooldown of 5 minutes (300000 ms)
export const COOLDOWN_MS = 300000;

// Firestore Collections
export const USERS_COLLECTION = 'users';
export const PIXELS_COLLECTION = 'pixels';

// Default canvas ID
export const DEFAULT_CANVAS_ID = 'main-canvas';

// Discord Bot Token
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

// Google Cloud Project ID (GOOGLE_CLOUD_PROJECT is auto-set by Cloud Run)
export const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT_ID || 'serverless-tek89';

// Discord API Base URL
export const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';

// Pub/Sub topic to trigger snapshot generation after pixel writes
export const SNAPSHOT_TRIGGER_TOPIC = process.env.SNAPSHOT_TRIGGER_TOPIC || 'canvas-snapshot-trigger';
