import { CONFIG } from '../config.js';
import { DiscordService } from '../services/discord.service.js';
import { FirestoreService } from '../services/firestore.service.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const firestore = new FirestoreService();

/**
 * Handle /lock and /unlock commands.
 * Sets the canvas status to 'paused' (lock) or 'active' (unlock).
 */
export async function handleLock(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken, command } = payload;
  const locking = command === 'lock';

  if (!payload.isAdmin) {
    await discord.sendError(applicationId, interactionToken, `You need administrator permissions to ${locking ? 'lock' : 'unlock'} the canvas.`);
    return;
  }

  try {
    const status = locking ? 'paused' : 'active';
    await firestore.updateCanvasStatus(CONFIG.canvasId, status);

    const emoji = locking ? '🔒' : '🔓';
    await discord.sendSuccess(
      applicationId,
      interactionToken,
      `${emoji} Canvas ${locking ? 'locked' : 'unlocked'}. Status: **${status}**.`,
    );

    console.log(JSON.stringify({
      level: 'info',
      message: `Canvas ${locking ? 'locked' : 'unlocked'} by ${payload.username}`,
      status,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: `Error ${locking ? 'locking' : 'unlocking'} canvas`,
      error: error instanceof Error ? error.message : String(error),
    }));
    await discord.sendError(applicationId, interactionToken, `Failed to ${locking ? 'lock' : 'unlock'} the canvas.`);
  }
}
