import { Timestamp } from '@google-cloud/firestore';
import { FirestoreService } from './services/firestore.service';
import { DiscordService } from './services/discord.service';
import { PixelPayload } from './types';
import { COOLDOWN_MS } from './config';

/**
 * Main service for processing pixel write requests
 * Handles rate-limiting, Firestore transactions and Discord feedback
 */
export class WritePixelService {
    constructor(
        private readonly firestoreService: FirestoreService,
        private readonly discordService: DiscordService,
    ) {}

    /**
     * Executes the complete processing of a pixel write request
     * 
     * @param payload - The pixel data to write
     * @throws Error if an error occurs during processing
     */
    async execute(payload: PixelPayload): Promise<void> {
        // Structured log for processing start
        console.log(
            JSON.stringify({
                level: 'info',
                message: 'Processing pixel write request',
                userId: payload.userId,
                x: payload.x,
                y: payload.y,
                color: payload.color,
                timestamp: new Date().toISOString(),
            }),
        );

        try {
            // 1. Rate-limiting check (cooldown)
            const canWrite = await this.checkCooldown(payload);
            
            if (!canWrite) {
                return; // Error message was already sent in checkCooldown
            }

            // 2. Write pixel with atomic transaction
            await this.writePixel(payload);

            // 3. Send success feedback to Discord
            await this.discordService.sendSuccessFollowUp(
                payload.interactionToken,
                payload.applicationId,
                `Pixel placed successfully at position (${payload.x}, ${payload.y})!`,
            );

            // Success log
            console.log(
                JSON.stringify({
                    level: 'info',
                    message: 'Pixel written successfully',
                    userId: payload.userId,
                    x: payload.x,
                    y: payload.y,
                    timestamp: new Date().toISOString(),
                }),
            );
        } catch (error) {
            // Error handling
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            console.error(
                JSON.stringify({
                    level: 'error',
                    message: 'Error writing pixel',
                    userId: payload.userId,
                    error: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString(),
                }),
            );

            // Attempt to send error message to Discord
            try {
                await this.discordService.sendErrorFollowUp(
                    payload.interactionToken,
                    payload.applicationId,
                    'An error occurred while writing the pixel. Please try again.',
                );
            } catch (discordError) {
                console.error(
                    JSON.stringify({
                        level: 'error',
                        message: 'Unable to send error message to Discord',
                        error: discordError instanceof Error ? discordError.message : String(discordError),
                    }),
                );
            }

            // Re-throw error so the worker can handle it
            throw error;
        }
    }

    /**
     * Checks if the user can write a pixel (cooldown)
     * 
     * @param payload - The pixel data
     * @returns true if the user can write, false otherwise
     */
    private async checkCooldown(payload: PixelPayload): Promise<boolean> {
        const user = await this.firestoreService.getUser(payload.userId);

        if (!user || !user.lastPixelAt) {
            // User's first pixel, no cooldown
            console.log(
                JSON.stringify({
                    level: 'info',
                    message: 'First pixel for this user - cooldown OK',
                    userId: payload.userId,
                }),
            );
            return true;
        }

        // Calculate elapsed time since last pixel
        const lastPixelTime = user.lastPixelAt.toMillis();
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastPixelTime;

        if (elapsedTime < COOLDOWN_MS) {
            // Cooldown active
            const remainingTime = COOLDOWN_MS - elapsedTime;
            const remainingMinutes = Math.ceil(remainingTime / 60000);

            console.log(
                JSON.stringify({
                    level: 'warn',
                    message: 'Error: Cooldown active',
                    userId: payload.userId,
                    elapsedMs: elapsedTime,
                    remainingMs: remainingTime,
                    remainingMinutes,
                    timestamp: new Date().toISOString(),
                }),
            );

            // Send error message to Discord
            await this.discordService.sendErrorFollowUp(
                payload.interactionToken,
                payload.applicationId,
                `Cooldown active! You must wait ${remainingMinutes} more minute${remainingMinutes > 1 ? 's' : ''}.`,
            );

            return false;
        }

        // Cooldown OK
        console.log(
            JSON.stringify({
                level: 'info',
                message: 'Cooldown OK - write authorized',
                userId: payload.userId,
                elapsedMs: elapsedTime,
            }),
        );

        return true;
    }

    /**
     * Writes the pixel to Firestore with an atomic transaction
     * 
     * @param payload - The pixel data to write
     */
    private async writePixel(payload: PixelPayload): Promise<void> {
        console.log(
            JSON.stringify({
                level: 'info',
                message: 'Executing Firestore transaction',
                userId: payload.userId,
                x: payload.x,
                y: payload.y,
            }),
        );

        const newTimestamp = Timestamp.now();
        await this.firestoreService.writePixelTransaction(payload, newTimestamp);
    }
}
