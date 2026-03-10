import { Injectable, Logger } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';
import axios from 'axios';
import {
  type DiscordInteraction,
  type InteractionResponse,
  type PixelCommandPayload,
  type DiscordCommandPayload,
  type ApplicationCommandOptionData,
  InteractionType,
  InteractionResponseType,
  COLOR_MAP,
  EPHEMERAL_FLAG,
  ADMINISTRATOR_PERMISSION,
} from './types';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly pubsub: PubSub;

  private readonly pixelTopic: string;
  private readonly cmdTopic: string;
  private readonly maxX: number;
  private readonly maxY: number;

  constructor() {
    this.pubsub = new PubSub({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'serverless-488811',
    });

    this.pixelTopic = process.env.PIXEL_TOPIC || 'write-pixel-requests';
    this.cmdTopic = process.env.DISCORD_CMD_TOPIC || 'discord-cmd-requests';

    const DEFAULT_MAX = 1000;
    const parsedX = parseInt(process.env.CANVAS_MAX_X || '', 10);
    const parsedY = parseInt(process.env.CANVAS_MAX_Y || '', 10);
    this.maxX = Number.isNaN(parsedX) ? DEFAULT_MAX : parsedX;
    this.maxY = Number.isNaN(parsedY) ? DEFAULT_MAX : parsedY;
  }

  /**
   * Route a Discord interaction to the appropriate handler.
   * Returns the immediate HTTP response to send back to Discord.
   */
  handleInteraction(interaction: DiscordInteraction): InteractionResponse {
    if (interaction.type === InteractionType.PING) {
      this.logger.log('Received PING from Discord');
      return { type: InteractionResponseType.PONG };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      return this.handleApplicationCommand(interaction);
    }

    this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Unsupported interaction type.', flags: EPHEMERAL_FLAG },
    };
  }

  private handleApplicationCommand(interaction: DiscordInteraction): InteractionResponse {
    const commandName = interaction.data?.name;

    if (!commandName) {
      this.logger.warn('Interaction missing command name');
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Invalid command.', flags: EPHEMERAL_FLAG },
      };
    }

    this.logger.log(`Handling command: /${commandName}`);

    switch (commandName) {
      case 'help':
        return this.handleHelp();
      case 'allo':
        return this.handleAllo();
      case 'draw':
        return this.handleDraw(interaction);
      case 'snapshot':
        return this.handleSnapshot(interaction);
      case 'session':
        return this.handleSession(interaction);
      case 'canvas':
        return this.handleCanvas(interaction);
      default:
        this.logger.warn(`Unknown command: /${commandName}`);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `Unknown command: \`/${commandName}\``, flags: EPHEMERAL_FLAG },
        };
    }
  }

  // --- Immediate response commands ---

  private handleHelp(): InteractionResponse {
    const content = [
      '**PixelHub Commands**',
      '`/draw x:<X> y:<Y> color:<color>` -- Place a pixel on the canvas',
      '`/snapshot` -- Generate and display a canvas snapshot',
      '`/canvas` -- View canvas information',
      '`/session <action>` -- Manage the canvas session (admin only)',
      '`/help` -- Show this help message',
      "`/allo` -- Respond to the call",
    ].join('\n');

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content, flags: EPHEMERAL_FLAG },
    };
  }

  private handleAllo(): InteractionResponse {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "a l'huile" },
    };
  }

  // --- Deferred response commands (publish to Pub/Sub) ---

  private handleDraw(interaction: DiscordInteraction): InteractionResponse {
    const options = interaction.data?.options || [];
    const x = this.getOptionValue<number>(options, 'x');
    const y = this.getOptionValue<number>(options, 'y');
    const colorKey = this.getOptionValue<string>(options, 'color');

    if (x === undefined || y === undefined || colorKey === undefined) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Missing required options: `x`, `y`, `color`.', flags: EPHEMERAL_FLAG },
      };
    }

    if (x < 0 || x >= this.maxX || y < 0 || y >= this.maxY) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Coordinates must be between 0-${this.maxX - 1} for X and 0-${this.maxY - 1} for Y.`,
          flags: EPHEMERAL_FLAG,
        },
      };
    }

    const colorNum = COLOR_MAP[colorKey];
    if (colorNum === undefined) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `Invalid color: \`${colorKey}\`.`, flags: EPHEMERAL_FLAG },
      };
    }

    const user = interaction.member?.user || interaction.user;
    const userId = user?.id || 'unknown';
    const username = user?.username || 'unknown';
    const avatarUrl = user?.avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png`
      : undefined;

    const payload: PixelCommandPayload = {
      userId,
      username,
      avatarUrl,
      x,
      y,
      color: colorNum,
      interactionToken: interaction.token,
      applicationId: interaction.application_id,
    };

    // Publish asynchronously -- don't await, we need to respond within 3s
    this.publishToTopic(this.pixelTopic, payload).catch((err: unknown) => {
      this.logger.error(`Failed to publish /draw to Pub/Sub: ${err instanceof Error ? err.message : String(err)}`);
      this.sendErrorFollowUp(interaction.application_id, interaction.token, 'Failed to process your pixel draw. Please try again.');
    });

    return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
  }

  private handleSnapshot(interaction: DiscordInteraction): InteractionResponse {
    const user = interaction.member?.user || interaction.user;
    const payload: DiscordCommandPayload = {
      command: 'snapshot',
      userId: user?.id || 'unknown',
      username: user?.username || 'unknown',
      isAdmin: this.isAdmin(interaction),
      interactionToken: interaction.token,
      applicationId: interaction.application_id,
      guildId: interaction.guild_id,
      channelId: interaction.channel_id,
    };

    this.publishToTopic(this.cmdTopic, payload).catch((err: unknown) => {
      this.logger.error(`Failed to publish /snapshot to Pub/Sub: ${err instanceof Error ? err.message : String(err)}`);
      this.sendErrorFollowUp(interaction.application_id, interaction.token, 'Failed to process your snapshot request. Please try again.');
    });

    return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
  }

  private handleSession(interaction: DiscordInteraction): InteractionResponse {
    if (!this.isAdmin(interaction)) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'You need administrator permissions to manage sessions.', flags: EPHEMERAL_FLAG },
      };
    }

    const options = interaction.data?.options || [];
    const action = this.getOptionValue<string>(options, 'action') as 'start' | 'pause' | 'reset' | undefined;

    if (!action || !['start', 'pause', 'reset'].includes(action)) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Invalid action. Use `start`, `pause`, or `reset`.', flags: EPHEMERAL_FLAG },
      };
    }

    const user = interaction.member?.user || interaction.user;
    const payload: DiscordCommandPayload = {
      command: 'session',
      action,
      userId: user?.id || 'unknown',
      username: user?.username || 'unknown',
      isAdmin: true,
      interactionToken: interaction.token,
      applicationId: interaction.application_id,
      guildId: interaction.guild_id,
      channelId: interaction.channel_id,
    };

    this.publishToTopic(this.cmdTopic, payload).catch((err: unknown) => {
      this.logger.error(`Failed to publish /session to Pub/Sub: ${err instanceof Error ? err.message : String(err)}`);
      this.sendErrorFollowUp(interaction.application_id, interaction.token, 'Failed to process your session command. Please try again.');
    });

    return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
  }

  private handleCanvas(interaction: DiscordInteraction): InteractionResponse {
    const user = interaction.member?.user || interaction.user;
    const payload: DiscordCommandPayload = {
      command: 'canvas',
      userId: user?.id || 'unknown',
      username: user?.username || 'unknown',
      isAdmin: this.isAdmin(interaction),
      interactionToken: interaction.token,
      applicationId: interaction.application_id,
      guildId: interaction.guild_id,
      channelId: interaction.channel_id,
    };

    this.publishToTopic(this.cmdTopic, payload).catch((err: unknown) => {
      this.logger.error(`Failed to publish /canvas to Pub/Sub: ${err instanceof Error ? err.message : String(err)}`);
      this.sendErrorFollowUp(interaction.application_id, interaction.token, 'Failed to process your canvas request. Please try again.');
    });

    return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
  }

  // --- Helpers ---

  private async publishToTopic(topicName: string, payload: PixelCommandPayload | DiscordCommandPayload): Promise<void> {
    const topic = this.pubsub.topic(topicName);
    const data = Buffer.from(JSON.stringify(payload));
    const messageId = await topic.publishMessage({ data });
    this.logger.log(`Published to ${topicName}: messageId=${messageId}`);
  }

  private getOptionValue<T>(
    options: ApplicationCommandOptionData[],
    name: string,
  ): T | undefined {
    const opt = options.find((o) => o.name === name);
    return opt?.value as T | undefined;
  }

  /**
   * Send an error follow-up message to Discord when Pub/Sub publish fails.
   * Since we already sent a DEFERRED response, the user sees "Bot is thinking..."
   * and this follow-up replaces it with an error message.
   */
  private sendErrorFollowUp(applicationId: string, interactionToken: string, message: string): void {
    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;
    axios.post(url, { content: message, flags: EPHEMERAL_FLAG }).catch((followUpErr: unknown) => {
      this.logger.error(`Failed to send error follow-up to Discord: ${followUpErr instanceof Error ? followUpErr.message : String(followUpErr)}`);
    });
  }

  private isAdmin(interaction: DiscordInteraction): boolean {
    const permissions = interaction.member?.permissions;
    if (!permissions) return false;

    try {
      return (BigInt(permissions) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
    } catch {
      return false;
    }
  }
}
