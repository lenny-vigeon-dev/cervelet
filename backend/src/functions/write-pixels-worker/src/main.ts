import express, { Request, Response } from 'express';
import { FirestoreService } from './services/firestore.service';
import { DiscordService } from './services/discord.service';
import { WritePixelService } from './write-pixel.service';
import { PixelPayload, PubSubMessage } from './types';
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
const writePixelService = new WritePixelService(firestoreService, discordService);

/**
 * Pub/Sub payload validation
 */
function isValidPixelPayload(payload: unknown): payload is PixelPayload {
    if (typeof payload !== 'object' || payload === null) return false;
    const p = payload as Record<string, unknown>;
    return (
        typeof p['userId'] === 'string' &&
        typeof p['x'] === 'number' &&
        typeof p['y'] === 'number' &&
        typeof p['color'] === 'number' &&
        typeof p['interactionToken'] === 'string' &&
        typeof p['applicationId'] === 'string'
    );
}

/**
 * Main endpoint to receive Pub/Sub messages
 */
app.post('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const pubsubMessage: PubSubMessage = req.body;
    const messageId = pubsubMessage?.message?.messageId || 'unknown';

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
        let payload: unknown;
        try {
            payload = JSON.parse(decodedData);
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
        if (!isValidPixelPayload(payload)) {
            logger.validationError('Invalid pixel payload structure', {
                messageId,
                receivedFields: payload ? Object.keys(payload as object) : [],
                payload,
            });
            res.status(400).send('Bad Request: Invalid payload structure');
            return;
        }

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
        logger.pubsubProcessed(messageId, durationMs, false);
        logger.error(`CRITICAL ERROR: Pub/Sub message processing failed ${messageId}`, {
            messageId,
            durationMs,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        res.status(500).send('Internal Server Error: Processing failed');
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
