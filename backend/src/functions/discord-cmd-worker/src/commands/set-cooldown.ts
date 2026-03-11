import { CONFIG } from '../config.js';
import { DiscordService } from '../services/discord.service.js';
import { FirestoreService } from '../services/firestore.service.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const firestore = new FirestoreService();

/**
 * Handle /set_cooldown command.
 * Updates the pixel placement cooldown stored in the canvas document.
 */
export async function handleSetCooldown(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken } = payload;

  if (!payload.isAdmin) {
    await discord.sendError(applicationId, interactionToken, 'You need administrator permissions to change the cooldown.');
    return;
  }

  const { cooldownSeconds } = payload;

  if (cooldownSeconds === undefined || cooldownSeconds < 0) {
    await discord.sendError(applicationId, interactionToken, 'Cooldown must be a non-negative integer (seconds).');
    return;
  }

  try {
    await firestore.setCooldown(CONFIG.canvasId, cooldownSeconds);

    const display = cooldownSeconds === 0
      ? 'disabled (0s)'
      : `**${cooldownSeconds}s**`;

    await discord.sendSuccess(
      applicationId,
      interactionToken,
      `Pixel cooldown set to ${display}.`,
    );

    console.log(JSON.stringify({
      level: 'info',
      message: `Cooldown set by ${payload.username}`,
      cooldownSeconds,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Error setting cooldown',
      error: error instanceof Error ? error.message : String(error),
    }));
    await discord.sendError(applicationId, interactionToken, 'Failed to set the cooldown.');
  }
}
