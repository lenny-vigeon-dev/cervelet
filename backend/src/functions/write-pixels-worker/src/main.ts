import express, { Request, Response } from 'express';
import { FirestoreService } from './services/firestore.service';
import { DiscordService } from './services/discord.service';
import { PubSubService } from './services/pubsub.service';
import { WritePixelService } from './write-pixel.service';
import { CooldownError, PixelPayload, PubSubMessage } from './types';
import { logger } from './utils/logger';

/**
 * Main entry point for the Cloud Run worker triggered by Pub/Sub
 */

// Express application initialization
const app = express();
app.use(express.json());

// Services initialization (singleton)
const firestoreService = new FirestoreService();
const discordService = new DiscordService();
const pubSubService = new PubSubService();
const writePixelService = new WritePixelService(firestoreService, discordService, pubSubService);

/**
 * Pub/Sub payload validation
 */
function isValidPixelPayload(payload: unknown): payload is PixelPayload {
    if (typeof payload !== 'object' || payload === null) return false;
    const p = payload as Record<string, unknown>;
    return (
        typeof p['userId'] === 'string' &&
        typeof p['username'] === 'string' &&
        typeof p['x'] === 'number' &&
        typeof p['y'] === 'number' &&
        typeof p['color'] === 'number' &&
        Number.isInteger(p['x']) &&
        Number.isInteger(p['y']) &&
        Number.isInteger(p['color']) &&
        (p['x'] as number) >= 0 &&
        (p['y'] as number) >= 0 &&
        (p['color'] as number) >= 0 &&
        (p['color'] as number) <= 0xFFFFFF &&
        (typeof p['interactionToken'] === 'string' || p['interactionToken'] === undefined) &&
        (typeof p['applicationId'] === 'string' || p['applicationId'] === undefined)
    );
}

/**
 * Main endpoint to receive Pub/Sub messages
 */
app.post('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const pubsubMessage: PubSubMessage = req.body;
    const messageId = pubsubMessage?.message?.messageId || 'unknown';
    let payload: PixelPayload | undefined;

    try {
        logger.pubsubReceived(messageId, pubsubMessage?.subscription || 'unknown');

        // Validate Pub/Sub message structure
        if (!pubsubMessage.message || !pubsubMessage.message.data) {
            logger.validationError('Missing Pub/Sub message data', {
                hasMessage: !!pubsubMessage.message,
                hasData: !!pubsubMessage?.message?.data,
            });
            res.status(400).send('Bad Request: Missing Pub/Sub message data');
            return;
        }

        // Base64 decoding
        let decodedData: string;
        try {
            decodedData = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
        } catch (error) {
            logger.error('ERROR: Base64 decoding failed', {
                messageId,
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(400).send('Bad Request: Invalid Base64 encoding');
            return;
        }

        // JSON parsing
        let parsedPayload: unknown;
        try {
            parsedPayload = JSON.parse(decodedData);
        } catch (error) {
            logger.validationError('JSON parsing failed', {
                messageId,
                rawData: decodedData.substring(0, 200),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(400).send('Bad Request: Invalid JSON');
            return;
        }

        // Payload validation
        if (!isValidPixelPayload(parsedPayload)) {
            logger.validationError('Invalid pixel payload structure', {
                messageId,
                receivedFields: parsedPayload ? Object.keys(parsedPayload as object) : [],
                payload: parsedPayload,
            });
            res.status(400).send('Bad Request: Invalid payload structure');
            return;
        }

        payload = parsedPayload;

        // Process pixel write
        logger.info(`Pixel placement request: ${payload.userId} wants to place at (${payload.x}, ${payload.y}) color #${payload.color.toString(16).padStart(6, '0')}`, {
            messageId,
            userId: payload.userId,
            coordinates: { x: payload.x, y: payload.y },
            color: payload.color,
            colorHex: '#' + payload.color.toString(16).padStart(6, '0'),
        });

        await writePixelService.execute(payload);

        const durationMs = Date.now() - startTime;
        logger.pubsubProcessed(messageId, durationMs, true);
        logger.pixelWrite(payload.userId, payload.x, payload.y, payload.color, true, durationMs);

        res.status(204).send();
    } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof CooldownError) {
            logger.pubsubProcessed(messageId, durationMs, true);
            if (payload) {
                logger.info(`Cooldown prevented pixel placement for user ${payload.userId}`, {
                    messageId,
                    userId: payload.userId,
                    coordinates: { x: payload.x, y: payload.y },
                    cooldownMessage: errorMessage,
                });
            } else {
                logger.info('Cooldown prevented pixel placement', {
                    messageId,
                    cooldownMessage: errorMessage,
                });
            }
            res.status(204).send();
        } else {
            logger.pubsubProcessed(messageId, durationMs, false);
            logger.error(`CRITICAL ERROR: Pub/Sub message processing failed ${messageId}`, {
                messageId,
                durationMs,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            res.status(500).send('Internal Server Error: Processing failed');
        }
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        service: 'write-pixels-worker',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Root endpoint - service info
 */
app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        service: 'write-pixels-worker',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// Server startup
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    logger.serviceStartup(PORT);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    logger.serviceShutdown('SIGTERM received');
    await firestoreService.close();
    process.exit(0);
});
