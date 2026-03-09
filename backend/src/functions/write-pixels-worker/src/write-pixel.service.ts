import { Timestamp } from '@google-cloud/firestore';
import { FirestoreService } from './services/firestore.service';
import { DiscordService } from './services/discord.service';
import { PubSubService } from './services/pubsub.service';
import { CooldownError, PixelPayload } from './types';
import { logger } from './utils/logger';

/**
 * Main service for processing pixel write requests.
 *
 * Handles the complete lifecycle:
 * 1. Atomic Firestore transaction (cooldown check + pixel write + history + metadata)
 * 2. Snapshot trigger (best-effort)
 * 3. Discord feedback (for slash command invocations)
 */
export class WritePixelService {
    constructor(
        private readonly firestoreService: FirestoreService,
        private readonly discordService: DiscordService,
        private readonly pubSubService?: PubSubService,
    ) {}

    /**
     * Executes the complete processing of a pixel write request.
     */
    async execute(payload: PixelPayload): Promise<void> {
        const startTime = Date.now();

        try {
            // 1. Write pixel with atomic transaction (includes cooldown check)
            const newTimestamp = Timestamp.now();
            const result = await this.firestoreService.writePixelTransaction(payload, newTimestamp);

            // 2. Handle cooldown rejection
            if (!result.success) {
                const remainingMs = result.cooldownRemainingMs || 0;
                const remainingSeconds = Math.ceil(remainingMs / 1000);

                logger.cooldownCheck(payload.userId, false, remainingMs);

                if (payload.interactionToken && payload.applicationId) {
                    try {
                        await this.discordService.sendErrorFollowUp(
                            payload.interactionToken,
                            payload.applicationId,
                            `Cooldown active! Wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}.`,
                        );
                        logger.discordWebhook('cooldown_error', payload.applicationId, true);
                    } catch (discordError) {
                        logger.discordWebhook('cooldown_error', payload.applicationId, false, undefined,
                            discordError instanceof Error ? discordError.message : String(discordError));
                    }
                }

                throw new CooldownError(remainingMs);
            }

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
                        `Pixel placed at (${payload.x}, ${payload.y})!`,
                    );
                    logger.discordWebhook('success_followup', payload.applicationId, true);
                } catch (discordError) {
                    logger.discordWebhook('success_followup', payload.applicationId, false, undefined,
                        discordError instanceof Error ? discordError.message : String(discordError));
                }
            }

            logger.info(`Pixel placed: ${payload.userId} at (${payload.x}, ${payload.y}) color #${payload.color.toString(16).padStart(6, '0')}`, {
                userId: payload.userId,
                coordinates: { x: payload.x, y: payload.y },
                color: payload.color,
                colorHex: '#' + payload.color.toString(16).padStart(6, '0'),
                totalDurationMs: Date.now() - startTime,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isCooldownError = error instanceof CooldownError;

            if (!isCooldownError) {
                logger.error(`Pixel placement failed: ${payload.userId} at (${payload.x}, ${payload.y}) - ${errorMessage}`, {
                    userId: payload.userId,
                    coordinates: { x: payload.x, y: payload.y },
                    error: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                    durationMs: Date.now() - startTime,
                });

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
            }

            throw error;
        }
    }
}
