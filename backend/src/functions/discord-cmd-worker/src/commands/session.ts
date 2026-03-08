import { DiscordService } from '../services/discord.service.js';
import { FirestoreService } from '../services/firestore.service.js';
import { CONFIG } from '../config.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const firestore = new FirestoreService();

/**
 * Handle /session command.
 * Admin-only: manage canvas sessions (start, pause, reset).
 */
export async function handleSession(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken, action, isAdmin } = payload;

  if (!isAdmin) {
    await discord.sendError(
      applicationId,
      interactionToken,
      'You need administrator permissions to manage sessions.',
    );
    return;
  }

  if (!action || !['start', 'pause', 'reset'].includes(action)) {
    await discord.sendError(
      applicationId,
      interactionToken,
      'Invalid action. Use `start`, `pause`, or `reset`.',
    );
    return;
  }

  try {
    const canvas = await firestore.getCanvas(CONFIG.canvasId);

    if (!canvas) {
      await discord.sendError(
        applicationId,
        interactionToken,
        `Canvas \`${CONFIG.canvasId}\` not found.`,
      );
      return;
    }

    switch (action) {
      case 'start':
        await firestore.updateCanvasStatus(CONFIG.canvasId, 'active');
        await discord.sendSuccess(
          applicationId,
          interactionToken,
          `Canvas session started. Status: **active**`,
        );
        break;

      case 'pause':
        await firestore.updateCanvasStatus(CONFIG.canvasId, 'paused');
        await discord.sendSuccess(
          applicationId,
          interactionToken,
          `Canvas session paused. No new pixels will be accepted.`,
        );
        break;

      case 'reset':
        await firestore.resetCanvas(CONFIG.canvasId);
        await discord.sendSuccess(
          applicationId,
          interactionToken,
          `Canvas has been reset. All pixels cleared, version incremented.`,
        );
        break;
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: `/session ${action} completed`,
        userId: payload.userId,
        canvasId: CONFIG.canvasId,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Error handling /session command',
        action,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    await discord.sendError(
      applicationId,
      interactionToken,
      `Failed to ${action} the session. Please try again.`,
    ).catch(() => { /* best-effort */ });
  }
}
