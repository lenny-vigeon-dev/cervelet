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
            message: `Unknown command: ${(payload as DiscordCommandPayload).command}`,
          }),
        );
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

    // Return 200 to prevent Pub/Sub infinite retries on unrecoverable errors.
    // Transient errors should throw before reaching here.
    res.status(200).json({ error: 'Processing failed' });
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
