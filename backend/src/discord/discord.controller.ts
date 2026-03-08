import { Body, Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { DiscordSignatureGuard } from './discord-signature.guard';
import { DiscordService } from './discord.service';
import type { DiscordInteraction, InteractionResponse } from './types';

/**
 * Handles incoming Discord Interactions via HTTP POST.
 *
 * Discord sends all slash command invocations and component interactions
 * to the configured Interactions Endpoint URL. This controller:
 *
 * 1. Verifies the Ed25519 signature (via DiscordSignatureGuard).
 * 2. Routes the interaction to the appropriate handler.
 * 3. Returns an immediate response (PONG, inline message, or deferred ACK).
 * 4. For deferred commands, publishes the payload to Pub/Sub for async processing.
 *
 * Route: POST /discord/interactions
 * API Gateway path: /discord/interactions (security: none -- Discord authenticates via signature)
 */
@Controller('discord')
export class DiscordController {
  private readonly logger = new Logger(DiscordController.name);

  constructor(private readonly discordService: DiscordService) {}

  @Post('interactions')
  @UseGuards(DiscordSignatureGuard)
  handleInteraction(@Body() body: DiscordInteraction): InteractionResponse {
    this.logger.log(
      `Interaction received: type=${body.type}, command=${body.data?.name || 'N/A'}`,
    );

    return this.discordService.handleInteraction(body);
  }
}
