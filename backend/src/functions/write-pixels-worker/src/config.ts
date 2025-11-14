/**
 * Configuration and constants for the write-pixels-worker
 */

// Cooldown of 5 minutes (300000 ms)
export const COOLDOWN_MS = 300000;

// Firestore Collections
export const USERS_COLLECTION = 'users';
export const CANVAS_COLLECTION = 'canvas';

// Discord Bot Token
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

// Google Cloud Project ID
export const PROJECT_ID = process.env.PROJECT_ID || process.env.GCLOUD_PROJECT || '';

// Discord API Base URL
export const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
