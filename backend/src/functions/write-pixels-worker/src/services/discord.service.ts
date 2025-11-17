import axios, { AxiosError } from 'axios';
import { DISCORD_API_BASE_URL } from '../config';

/**
 * Discord service for sending follow-up messages
 * Uses Discord REST API (not discord.js to keep it lightweight)
 */
export class DiscordService {
  /**
   * Sends a follow-up message to Discord via the interaction webhook
   * 
   * @param interactionToken - Discord interaction token
   * @param applicationId - Discord application ID
   * @param message - Message to send
   * @throws Error if sending fails
   */
  async sendFollowUp(
    interactionToken: string,
    applicationId: string,
    message: string,
  ): Promise<void> {
    const url = `${DISCORD_API_BASE_URL}/webhooks/${applicationId}/${interactionToken}`;

    try {
      await axios.post(url, {
        content: message,
        flags: 64, // EPHEMERAL flag - visible only to the user
      });

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Discord follow-up sent successfully',
          applicationId,
        }),
      );
    } catch (error) {
      // Detailed error handling
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Error sending Discord follow-up',
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            applicationId,
          }),
        );
      } else {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Unknown error sending Discord follow-up',
            error: error instanceof Error ? error.message : String(error),
            applicationId,
          }),
        );
      }
      throw error;
    }
  }

  /**
   * Sends a formatted error message to Discord
   * 
   * @param interactionToken - Discord interaction token
   * @param applicationId - Discord application ID
   * @param errorMessage - Error message
   */
  async sendErrorFollowUp(
    interactionToken: string,
    applicationId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.sendFollowUp(
      interactionToken,
      applicationId,
      `❌ **Error**: ${errorMessage}`,
    );
  }

  /**
   * Sends a formatted success message to Discord
   * 
   * @param interactionToken - Discord interaction token
   * @param applicationId - Discord application ID
   * @param successMessage - Success message
   */
  async sendSuccessFollowUp(
    interactionToken: string,
    applicationId: string,
    successMessage: string,
  ): Promise<void> {
    await this.sendFollowUp(
      interactionToken,
      applicationId,
      `✅ **Success**: ${successMessage}`,
    );
  }
}
