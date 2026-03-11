import { PubSub } from '@google-cloud/pubsub';
import { CONFIG } from '../config.js';
import { DiscordService } from '../services/discord.service.js';
import { FirestoreService } from '../services/firestore.service.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const firestore = new FirestoreService();
const pubsub = new PubSub({ projectId: CONFIG.gcpProject });

/**
 * Handle /clear command.
 * Deletes all pixels from the canvas without changing version or status.
 */
export async function handleClear(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken } = payload;

  if (!payload.isAdmin) {
    await discord.sendError(applicationId, interactionToken, 'You need administrator permissions to clear the canvas.');
    return;
  }

  try {
    const deleted = await firestore.clearCanvas(CONFIG.canvasId);

    // Regenerate snapshot so the PNG reflects the empty canvas
    try {
      await pubsub.topic('snapshot-requests').publishMessage({
        data: Buffer.from(JSON.stringify({ canvasId: CONFIG.canvasId })),
      });
    } catch (err) {
      console.log(JSON.stringify({
        level: 'warn',
        message: 'Could not trigger snapshot after clear',
        error: err instanceof Error ? err.message : String(err),
      }));
    }

    await discord.sendSuccess(
      applicationId,
      interactionToken,
      `Canvas cleared. Removed ${deleted} pixel(s).`,
    );

    console.log(JSON.stringify({
      level: 'info',
      message: `Canvas cleared by ${payload.username}`,
      deletedPixels: deleted,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Error clearing canvas',
      error: error instanceof Error ? error.message : String(error),
    }));
    await discord.sendError(applicationId, interactionToken, 'Failed to clear the canvas.');
  }
}
