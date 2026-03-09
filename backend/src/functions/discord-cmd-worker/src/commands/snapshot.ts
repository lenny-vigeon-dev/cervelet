import { CONFIG } from '../config.js';
import { DiscordService } from '../services/discord.service.js';
import type { DiscordCommandPayload } from '../types.js';

const discord = new DiscordService();

/**
 * Handle /snapshot command.
 * Fetches the latest canvas snapshot PNG and posts it to Discord.
 *
 * If SNAPSHOT_GENERATOR_URL is set, triggers a fresh generation first.
 * Otherwise, uses the latest snapshot from Cloud Storage directly.
 */
export async function handleSnapshot(payload: DiscordCommandPayload): Promise<void> {
  const { applicationId, interactionToken } = payload;

  try {
    // Optionally trigger a fresh snapshot generation
    if (CONFIG.snapshotGeneratorUrl) {
      try {
        const res = await fetch(`${CONFIG.snapshotGeneratorUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canvasId: CONFIG.canvasId }),
        });

        if (!res.ok) {
          console.log(
            JSON.stringify({
              level: 'warn',
              message: `Snapshot generation returned ${res.status}, falling back to cached snapshot`,
            }),
          );
        }
      } catch (err) {
        console.log(
          JSON.stringify({
            level: 'warn',
            message: 'Could not trigger snapshot generation, using cached',
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }

    // Add cache-busting timestamp to get the freshest version
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
