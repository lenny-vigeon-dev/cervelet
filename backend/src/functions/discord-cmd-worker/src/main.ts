import express from 'express';
import { CONFIG } from './config.js';
import { handleSnapshot } from './commands/snapshot.js';
import { handleSession } from './commands/session.js';
import { handleCanvasInfo } from './commands/canvas.js';
import type { PubSubMessage, DiscordCommandPayload } from './types.js';

const app = express();
app.use(express.json());

/**
 * Health check endpoint.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'discord-cmd-worker' });
});

app.get('/', (_req, res) => {
  res.json({ service: 'discord-cmd-worker', version: '1.0.0' });
});

/**
 * Pub/Sub push endpoint.
 * Receives messages from the 'discord-cmd-requests' topic subscription.
 */
app.post('/', async (req, res) => {
  try {
    const pubsubMessage = req.body as PubSubMessage;

    if (!pubsubMessage?.message?.data) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Invalid Pub/Sub message: missing message.data',
        }),
      );
      // Return 200 to avoid Pub/Sub retry on invalid messages
      res.status(200).json({ error: 'Invalid message format' });
      return;
    }

    const rawData = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
    const payload: DiscordCommandPayload = JSON.parse(rawData);

    // Validate required fields
    if (!payload.command || !payload.interactionToken || !payload.applicationId) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Invalid Discord command payload: missing required fields',
          receivedFields: Object.keys(payload),
        }),
      );
      // ACK to avoid retry on permanently invalid messages
      res.status(200).json({ error: 'Invalid payload structure' });
      return;
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Processing Discord command: /${payload.command}`,
        userId: payload.userId,
        messageId: pubsubMessage.message.messageId,
      }),
    );

    switch (payload.command) {
      case 'snapshot':
        await handleSnapshot(payload);
        break;
      case 'session':
        await handleSession(payload);
        break;
      case 'canvas':
        await handleCanvasInfo(payload);
        break;
      default:
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: `Unknown command: ${payload.command}`,
          }),
        );
        // Send error follow-up so the deferred response doesn't hang
        {
          const { DiscordService } = await import('./services/discord.service.js');
          const discord = new DiscordService();
          await discord.sendError(payload.applicationId, payload.interactionToken, `Unknown command: \`/${payload.command}\``);
        }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Error processing Pub/Sub message',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );

    // Return 500 so Pub/Sub retries the message (and eventually routes to DLQ).
    // Only ACK (200) permanently invalid messages -- those are handled above
    // (e.g. missing message.data).
    res.status(500).json({ error: 'Processing failed' });
  }
});

const server = app.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(
    JSON.stringify({
      level: 'info',
      message: `discord-cmd-worker listening on port ${CONFIG.port}`,
    }),
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(
    JSON.stringify({ level: 'info', message: 'SIGTERM received, shutting down' }),
  );
  server.close(() => process.exit(0));
});
