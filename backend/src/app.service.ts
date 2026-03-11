import { Injectable } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';
import axios from 'axios';

interface PixelWritePayload {
  x: number;
  y: number;
  color: number;
  accessToken: string;
}

@Injectable()
export class AppService {
  private pubsub: PubSub;
  private readonly topicName = 'write-pixel-requests';

  constructor() {
    this.pubsub = new PubSub({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'serverless-488811',
    });
  }

  async publishPixelWrite(payload: PixelWritePayload): Promise<void> {
    try {
      console.log('Publishing pixel write:', { x: payload.x, y: payload.y, color: payload.color });

      const topic = this.pubsub.topic(this.topicName);

      // Fetch Discord user info to get userId, username, and avatar
      const discordUser = await this.fetchDiscordUser(payload.accessToken);
      console.log('Discord user fetched:', discordUser.id, discordUser.username);

      const message = {
        userId: discordUser.id,
        username: discordUser.username,
        avatarUrl: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : undefined,
        x: payload.x,
        y: payload.y,
        color: payload.color,
      };

      const dataBuffer = Buffer.from(JSON.stringify(message));

      await topic.publishMessage({
        data: dataBuffer,
      });

      console.log('Published pixel write to Pub/Sub:', message);
    } catch (error) {
      console.error('Error in publishPixelWrite:', error);
      throw error;
    }
  }

  /**
   * Exchange a Discord access token for a Firebase Custom Token.
   * Calls the firebase-auth-token Cloud Run service with OIDC auth.
   */
  async getFirebaseToken(discordAccessToken: string): Promise<{ token: string }> {
    const serviceUrl = process.env.FIREBASE_AUTH_TOKEN_URL;
    if (!serviceUrl) {
      throw new Error('FIREBASE_AUTH_TOKEN_URL is not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // On Cloud Run, fetch an OIDC ID token from the metadata server
    // to authenticate to the firebase-auth-token service (IAM auth).
    const idToken = await this.getIdToken(serviceUrl);
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await axios.post(serviceUrl, { discordAccessToken }, { headers });
    return response.data;
  }

  /**
   * Fetch a Google OIDC ID token from the metadata server.
   * Returns null when not running on GCP (local dev).
   */
  private async getIdToken(audience: string): Promise<string | null> {
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`;
    try {
      const res = await axios.get(url, {
        headers: { 'Metadata-Flavor': 'Google' },
        timeout: 3000,
      });
      return res.data;
    } catch {
      return null;
    }
  }

  private async fetchDiscordUser(accessToken: string): Promise<{ id: string; username: string; avatar?: string }> {
    try {
      const response = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id,
        username: response.data.username,
        avatar: response.data.avatar,
      };
    } catch (error) {
      console.error('Error fetching Discord user:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Discord API error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw new Error('Failed to validate Discord access token');
    }
  }
}
