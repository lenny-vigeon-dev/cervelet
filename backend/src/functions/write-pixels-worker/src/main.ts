import express, { Request, Response } from 'express';
import { FirestoreService } from './services/firestore.service';
import { DiscordService } from './services/discord.service';
import { WritePixelService } from './write-pixel.service';
import { PixelPayload, PubSubMessage } from './types';

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
 * 
 * @param payload - The payload to validate
 * @returns true if valid, false otherwise
 */
function isValidPixelPayload(payload: any): payload is PixelPayload {
    return (
        typeof payload === 'object' &&
        typeof payload.userId === 'string' &&
        typeof payload.x === 'number' &&
        typeof payload.y === 'number' &&
        typeof payload.color === 'number' &&
        (typeof payload.interactionToken === 'string' || payload.interactionToken === undefined) &&
        (typeof payload.applicationId === 'string' || payload.applicationId === undefined)
    );
}

/**
 * Http payload validation (no interaction tokens)
 */
function isValidHttpPixelPayload(body: any): body is { x: number; y: number; color: number } {
    return (
        body &&
        typeof body.x === 'number' &&
        typeof body.y === 'number' &&
        typeof body.color === 'number'
    );
}

/**
 * Simple CORS handling for direct HTTP calls from the frontend
 */
app.options('/write', (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send();
});

/**
 * Direct HTTP endpoint for frontend calls.
 * The client sends a Discord OAuth access token (Bearer) in Authorization header.
 * We validate the token by fetching /users/@me, then reuse the same write flow
 * without requiring Firebase Auth on the client.
 */
app.post('/write', async (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', '*');

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        res.status(401).json({ error: 'Missing Discord access token (Authorization: Bearer ...)' });
        return;
    }

    const accessToken = authHeader.split(' ')[1];
    if (!accessToken) {
        res.status(401).json({ error: 'Missing Discord access token (Authorization: Bearer ...)' });
        return;
    }

    // Validate body
    if (!isValidHttpPixelPayload(req.body)) {
        res.status(400).json({ error: 'Invalid payload. Expected { x: number, y: number, color: number }' });
        return;
    }

    // Fetch user from Discord to authenticate request
    let discordUserId: string;
    try {
        const discordUser = await discordService.fetchUserFromAccessToken(accessToken);
        discordUserId = discordUser.id;
    } catch (error) {
        res.status(401).json({ error: 'Invalid Discord access token' });
        return;
    }

    const payload: PixelPayload = {
        userId: discordUserId,
        x: req.body.x,
        y: req.body.y,
        color: req.body.color,
    };

    // Basic bounds validation for color
    if (payload.color < 0 || payload.color > 0xFFFFFF) {
        res.status(400).json({ error: 'Color must be between 0 and 16777215 (0xFFFFFF)' });
        return;
    }

    try {
        await writePixelService.execute(payload, { sendDiscordFeedback: false });
        res.status(200).json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        res.status(500).json({ error: message });
    }
});

/**
 * Main endpoint to receive Pub/Sub messages
 * Cloud Run receives Pub/Sub messages via HTTP POST
 */
app.post('/', async (req: Request, res: Response) => {
    try {
        // Log message reception
        console.log(
            JSON.stringify({
                level: 'info',
                message: 'Pub/Sub message received',
                timestamp: new Date().toISOString(),
            }),
        );

        // Check for Pub/Sub message presence
        const pubsubMessage: PubSubMessage = req.body;
        
        if (!pubsubMessage.message || !pubsubMessage.message.data) {
            console.error(
                JSON.stringify({
                    level: 'error',
                    message: 'Invalid Pub/Sub message - missing data',
                    body: req.body,
                }),
            );
            res.status(400).send('Bad Request: Missing Pub/Sub message data');
            return;
        }

        // Base64 decoding
        let decodedData: string;
        try {
            decodedData = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
        } catch (error) {
            console.error(
                JSON.stringify({
                    level: 'error',
                    message: 'Base64 decoding error',
                    error: error instanceof Error ? error.message : String(error),
                }),
            );
            res.status(400).send('Bad Request: Invalid Base64 encoding');
            return;
        }

        // JSON parsing
        let payload: any;
        try {
            payload = JSON.parse(decodedData);
        } catch (error) {
            console.error(
                JSON.stringify({
                    level: 'error',
                    message: 'JSON parsing error',
                    data: decodedData,
                    error: error instanceof Error ? error.message : String(error),
                }),
            );
            res.status(400).send('Bad Request: Invalid JSON');
            return;
        }

        // Payload validation
        if (!isValidPixelPayload(payload)) {
            console.error(
                JSON.stringify({
                    level: 'error',
                    message: 'Invalid payload - incorrect structure',
                    payload,
                }),
            );
            res.status(400).send('Bad Request: Invalid payload structure');
            return;
        }

        // Pixel processing
        try {
            await writePixelService.execute(payload);
            
            // Pub/Sub message acknowledgment (success)
            console.log(
                JSON.stringify({
                    level: 'info',
                    message: 'Pub/Sub message processed successfully',
                    messageId: pubsubMessage.message.messageId,
                    timestamp: new Date().toISOString(),
                }),
            );
            
            res.status(204).send(); // 204 No Content = success
        } catch (error) {
            // Processing error - Pub/Sub will retry
            console.error(
                JSON.stringify({
                    level: 'error',
                    message: 'Error processing message',
                    messageId: pubsubMessage.message.messageId,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString(),
                }),
            );
            
            // 500 = temporary error, Pub/Sub will retry
            res.status(500).send('Internal Server Error: Processing failed');
        }
    } catch (error) {
        // Unexpected error
        console.error(
            JSON.stringify({
                level: 'error',
                message: 'Unexpected error in main handler',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString(),
            }),
        );
        
        res.status(500).send('Internal Server Error');
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy' });
});

/**
 * Root endpoint to verify the service is active
 */
app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        service: 'write-pixels-worker',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

// Server startup
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(
        JSON.stringify({
            level: 'info',
            message: `write-pixels-worker started on port ${PORT}`,
            port: PORT,
            timestamp: new Date().toISOString(),
        }),
    );
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log(
        JSON.stringify({
            level: 'info',
            message: 'SIGTERM signal received - graceful shutdown',
            timestamp: new Date().toISOString(),
        }),
    );
    
    await firestoreService.close();
    process.exit(0);
});
