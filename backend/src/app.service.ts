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
      projectId: process.env.GCP_PROJECT || 'serverless-tek89',
    });
  }

  async publishPixelWrite(payload: PixelWritePayload): Promise<void> {
    try {
      console.log('Publishing pixel write:', { x: payload.x, y: payload.y, color: payload.color });

      const topic = this.pubsub.topic(this.topicName);

      // Fetch Discord user info to get userId
      const discordUser = await this.fetchDiscordUser(payload.accessToken);
      console.log('Discord user fetched:', discordUser.id);

      const message = {
        userId: discordUser.id,
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

  private async fetchDiscordUser(accessToken: string): Promise<{ id: string }> {
    try {
      const response = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Discord user:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Discord API error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw new Error('Failed to validate Discord access token');
    }
  }
}
