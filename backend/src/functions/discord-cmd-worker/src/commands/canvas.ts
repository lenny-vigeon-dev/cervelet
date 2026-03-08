import { DiscordService } from '../services/discord.service.js';
import { FirestoreService } from '../services/firestore.service.js';
import { CONFIG } from '../config.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const firestore = new FirestoreService();

/**
 * Handle /canvas command.
 * Returns canvas metadata: size, status, pixel count, and snapshot URL.
 */
export async function handleCanvasInfo(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken } = payload;

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

    const pixelCount = await firestore.countPixels(CONFIG.canvasId);

    const totalCells = canvas.width * canvas.height;
    const fillPercent = totalCells > 0
      ? ((pixelCount / totalCells) * 100).toFixed(1)
      : '0.0';

    const statusEmoji: Record<string, string> = {
      active: '🟢',
      paused: '🟡',
      reset: '🔴',
    };

    const lines = [
      `**Canvas: \`${CONFIG.canvasId}\`**`,
      '',
      `${statusEmoji[canvas.status] || '⚪'} Status: **${canvas.status}**`,
      `📐 Size: **${canvas.width} x ${canvas.height}** (${totalCells.toLocaleString()} cells)`,
      `🎨 Pixels placed: **${pixelCount.toLocaleString()}** (${fillPercent}% filled)`,
      `📋 Version: **${canvas.version}**`,
      '',
      `🖼️ [View latest snapshot](${CONFIG.snapshotUrl})`,
    ];

    await discord.sendFollowUp(
      applicationId,
      interactionToken,
      lines.join('\n'),
    );

    console.log(
      JSON.stringify({
        level: 'info',
        message: '/canvas command completed',
        userId: payload.userId,
        pixelCount,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Error handling /canvas command',
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    await discord.sendError(
      applicationId,
      interactionToken,
      'Failed to retrieve canvas information.',
    ).catch(() => { /* best-effort */ });
  }
}
