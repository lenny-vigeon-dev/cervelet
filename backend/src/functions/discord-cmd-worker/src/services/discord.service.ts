import axios, { type AxiosError } from 'axios';
import { CONFIG } from '../config.js';

/**
 * Sends follow-up messages to Discord via the interaction webhook.
 * Used after responding with type 5 (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE).
 */
export class DiscordService {
  async sendFollowUp(
    applicationId: string,
    interactionToken: string,
    content: string,
  ): Promise<void> {
    const url = `${CONFIG.discordApiBase}/webhooks/${applicationId}/${interactionToken}`;

    try {
      await axios.post(url, { content });
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Discord follow-up sent',
          applicationId,
        }),
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axErr = error as AxiosError;
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Failed to send Discord follow-up',
            status: axErr.response?.status,
            data: axErr.response?.data,
          }),
        );
      }
      throw error;
    }
  }

  async sendFollowUpWithEmbed(
    applicationId: string,
    interactionToken: string,
    content: string,
    imageUrl?: string,
  ): Promise<void> {
    const url = `${CONFIG.discordApiBase}/webhooks/${applicationId}/${interactionToken}`;

    const body: Record<string, unknown> = { content };

    if (imageUrl) {
      body['embeds'] = [
        {
          image: { url: imageUrl },
          color: 0x5865f2, // Discord blurple
        },
      ];
    }

    try {
      await axios.post(url, body);
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Discord follow-up with embed sent',
          applicationId,
        }),
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axErr = error as AxiosError;
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Failed to send Discord embed follow-up',
            status: axErr.response?.status,
            data: axErr.response?.data,
          }),
        );
      }
      throw error;
    }
  }

  async sendError(
    applicationId: string,
    interactionToken: string,
    errorMessage: string,
  ): Promise<void> {
    await this.sendFollowUp(
      applicationId,
      interactionToken,
      `**Error**: ${errorMessage}`,
    );
  }

  async sendSuccess(
    applicationId: string,
    interactionToken: string,
    successMessage: string,
  ): Promise<void> {
    await this.sendFollowUp(
      applicationId,
      interactionToken,
      `**Success**: ${successMessage}`,
    );
  }
}
