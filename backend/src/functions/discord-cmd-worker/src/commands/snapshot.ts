import { PubSub } from '@google-cloud/pubsub';
import { CONFIG } from '../config.js';
import { DiscordService } from '../services/discord.service.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();
const pubsub = new PubSub({ projectId: CONFIG.gcpProject });

/**
 * Handle /snapshot command.
 * Triggers a fresh snapshot generation via Pub/Sub, waits for it,
 * then posts the resulting PNG to Discord.
 */
export async function handleSnapshot(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken } = payload;

  try {
    // Trigger a fresh snapshot via Pub/Sub and wait for it to generate
    try {
      await pubsub.topic('snapshot-requests').publishMessage({
        data: Buffer.from(JSON.stringify({
          canvasId: CONFIG.canvasId,
          requestedBy: payload.userId,
        })),
      });
      // Wait for the snapshot generator to process
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.log(JSON.stringify({
        level: 'warn',
        message: 'Could not trigger snapshot generation, using cached',
        error: err instanceof Error ? err.message : String(err),
      }));
    }

    const snapshotUrl = `${CONFIG.snapshotUrl}?t=${Date.now()}`;

    // Verify the snapshot is accessible
    const headRes = await fetch(snapshotUrl, { method: 'HEAD' });

    if (!headRes.ok) {
      await discord.sendError(
        applicationId,
        interactionToken,
        `Canvas snapshot is not available (HTTP ${headRes.status}).`,
      );
      return;
    }

    await discord.sendFollowUpWithEmbed(
      applicationId,
      interactionToken,
      'Here is the latest canvas snapshot:',
      snapshotUrl,
    );

    console.log(
      JSON.stringify({
        level: 'info',
        message: '/snapshot command completed',
        userId: payload.userId,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Error handling /snapshot command',
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    await discord.sendError(
      applicationId,
      interactionToken,
      'An unexpected error occurred while generating the snapshot.',
    ).catch(() => { /* best-effort */ });
  }
}
