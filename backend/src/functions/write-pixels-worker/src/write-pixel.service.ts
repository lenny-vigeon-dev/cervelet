import { Timestamp } from '@google-cloud/firestore';
import { FirestoreService } from './services/firestore.service';
import { DiscordService } from './services/discord.service';
import { PubSubService } from './services/pubsub.service';
import { PixelPayload } from './types';
import { COOLDOWN_MS } from './config';
import { logger } from './utils/logger';

/**
 * Main service for processing pixel write requests
 * Handles rate-limiting, Firestore transactions and Discord feedback
 */
export class WritePixelService {
    constructor(
        private readonly firestoreService: FirestoreService,
        private readonly discordService: DiscordService,
        private readonly pubSubService?: PubSubService,
    ) {}

    /**
     * Executes the complete processing of a pixel write request
     */
    async execute(payload: PixelPayload): Promise<void> {
        const startTime = Date.now();

        try {
            // 1. Rate-limiting check (cooldown)
            await this.checkCooldown(payload);

            // 2. Write pixel with atomic transaction
            await this.writePixel(payload);

            // 3. Trigger snapshot generation asynchronously (best-effort)
            if (this.pubSubService) {
                this.pubSubService.triggerSnapshot().catch((err) => {
                    logger.error('Failed to publish snapshot trigger', {
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            }

            // 4. Send success feedback to Discord
            if (payload.interactionToken && payload.applicationId) {
                try {
                    await this.discordService.sendSuccessFollowUp(
                        payload.interactionToken,
                        payload.applicationId,
                        `Pixel placed successfully at position (${payload.x}, ${payload.y})!`,
                    );
                    logger.discordWebhook('success_followup', payload.applicationId, true);
                } catch (discordError) {
                    logger.discordWebhook('success_followup', payload.applicationId, false, undefined,
                        discordError instanceof Error ? discordError.message : String(discordError));
                }
            }

            logger.info(`Pixel placed successfully: ${payload.userId} at (${payload.x}, ${payload.y}) color #${payload.color.toString(16).padStart(6, '0')}`, {
                userId: payload.userId,
                coordinates: { x: payload.x, y: payload.y },
                color: payload.color,
                colorHex: '#' + payload.color.toString(16).padStart(6, '0'),
                totalDurationMs: Date.now() - startTime,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error(`ERROR pixel placement: ${payload.userId} at (${payload.x}, ${payload.y}) - ${errorMessage}`, {
                userId: payload.userId,
                coordinates: { x: payload.x, y: payload.y },
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                durationMs: Date.now() - startTime,
            });

            // Attempt to send error message to Discord
            if (payload.interactionToken && payload.applicationId) {
                try {
                    await this.discordService.sendErrorFollowUp(
                        payload.interactionToken,
                        payload.applicationId,
                        'An error occurred while writing the pixel. Please try again.',
                    );
                    logger.discordWebhook('error_followup', payload.applicationId, true);
                } catch (discordError) {
                    logger.discordWebhook('error_followup', payload.applicationId, false, undefined,
                        discordError instanceof Error ? discordError.message : String(discordError));
                }
            }

            throw error;
        }
    }

    /**
     * Checks if the user can write a pixel (cooldown)
     * @throws Error if cooldown is active
     */
    private async checkCooldown(payload: PixelPayload): Promise<void> {
        const startTime = Date.now();
        const user = await this.firestoreService.getUser(payload.userId);

        logger.firestoreOperation('read', 'users', payload.userId, Date.now() - startTime, true);

        if (!user || !user.lastPixelPlaced) {
            logger.cooldownCheck(payload.userId, true);
            return;
        }

        const lastPixelTime = user.lastPixelPlaced.toMillis();
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastPixelTime;

        if (elapsedTime < COOLDOWN_MS) {
            const remainingTime = COOLDOWN_MS - elapsedTime;
            const remainingMinutes = Math.ceil(remainingTime / 60000);
            const remainingSeconds = Math.ceil(remainingTime / 1000);

            logger.cooldownCheck(payload.userId, false, remainingTime);

            if (payload.interactionToken && payload.applicationId) {
                try {
                    await this.discordService.sendErrorFollowUp(
                        payload.interactionToken,
                        payload.applicationId,
                        `Cooldown active! You must wait ${remainingMinutes} more minute${remainingMinutes > 1 ? 's' : ''}.`,
                    );
                    logger.discordWebhook('cooldown_error', payload.applicationId, true);
                } catch (discordError) {
                    logger.discordWebhook('cooldown_error', payload.applicationId, false, undefined,
                        discordError instanceof Error ? discordError.message : String(discordError));
                }
            }

            // Throw error for HTTP clients with remaining time info
            const error = new Error(`Cooldown active. Wait ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} (${remainingSeconds}s).`) as Error & { remainingMs?: number };
            error.remainingMs = remainingTime;
            throw error;
        }

        logger.cooldownCheck(payload.userId, true);
    }

    /**
     * Writes the pixel to Firestore with an atomic transaction
     */
    private async writePixel(payload: PixelPayload): Promise<void> {
        const startTime = Date.now();
        const documentId = `main-canvas_${payload.x}_${payload.y}`;

        try {
            const newTimestamp = Timestamp.now();
            await this.firestoreService.writePixelTransaction(payload, newTimestamp);

            logger.firestoreOperation('transaction', 'pixels', documentId, Date.now() - startTime, true);
        } catch (error) {
            logger.firestoreOperation('transaction', 'pixels', documentId, Date.now() - startTime, false,
                error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
}
