import axios, { AxiosError } from 'axios';
import { DISCORD_API_BASE_URL } from '../src/config';

/**
 * Service Discord pour envoyer des messages de suivi (follow-up)
 * Utilise l'API REST de Discord (pas discord.js pour rester léger)
 */
export class DiscordService {
  /**
   * Envoie un message de suivi à Discord via le webhook d'interaction
   * 
   * @param interactionToken - Token de l'interaction Discord
   * @param applicationId - ID de l'application Discord
   * @param message - Message à envoyer
   * @throws Error si l'envoi échoue
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
        flags: 64, // EPHEMERAL flag - visible uniquement par l'utilisateur
      });

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Discord follow-up envoyé avec succès',
          applicationId,
        }),
      );
    } catch (error) {
      // Gestion détaillée des erreurs
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Erreur lors de l\'envoi du follow-up Discord',
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            applicationId,
          }),
        );
      } else {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Erreur inconnue lors de l\'envoi du follow-up Discord',
            error: error instanceof Error ? error.message : String(error),
            applicationId,
          }),
        );
      }
      throw error;
    }
  }

  /**
   * Envoie un message d'erreur formaté à Discord
   * 
   * @param interactionToken - Token de l'interaction Discord
   * @param applicationId - ID de l'application Discord
   * @param errorMessage - Message d'erreur
   */
  async sendErrorFollowUp(
    interactionToken: string,
    applicationId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.sendFollowUp(
      interactionToken,
      applicationId,
      `❌ **Erreur**: ${errorMessage}`,
    );
  }

  /**
   * Envoie un message de succès formaté à Discord
   * 
   * @param interactionToken - Token de l'interaction Discord
   * @param applicationId - ID de l'application Discord
   * @param successMessage - Message de succès
   */
  async sendSuccessFollowUp(
    interactionToken: string,
    applicationId: string,
    successMessage: string,
  ): Promise<void> {
    await this.sendFollowUp(
      interactionToken,
      applicationId,
      `✅ **Succès**: ${successMessage}`,
    );
  }
}
