import { CONFIG } from '../config.js';
import { DiscordService } from '../services/discord.service.js';
import { FirestoreService } from '../services/firestore.service.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const firestore = new FirestoreService();

/**
 * Handle /resize command.
 * Updates the canvas dimensions.
 */
export async function handleResize(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken } = payload;

  if (!payload.isAdmin) {
    await discord.sendError(applicationId, interactionToken, 'You need administrator permissions to resize the canvas.');
    return;
  }

  const { width, height } = payload;

  if (!width || !height || width < 1 || height < 1) {
    await discord.sendError(applicationId, interactionToken, 'Width and height must be positive integers.');
    return;
  }

  try {
    await firestore.resizeCanvas(CONFIG.canvasId, width, height);

    await discord.sendSuccess(
      applicationId,
      interactionToken,
      `Canvas resized to **${width}x${height}**.`,
    );

    console.log(JSON.stringify({
      level: 'info',
      message: `Canvas resized by ${payload.username}`,
      width,
      height,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Error resizing canvas',
      error: error instanceof Error ? error.message : String(error),
    }));
    await discord.sendError(applicationId, interactionToken, 'Failed to resize the canvas.');
  }
}
