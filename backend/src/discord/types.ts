/**
 * Discord Interaction types for the Interactions API (HTTP endpoint).
 *
 * Reference: https://discord.com/developers/docs/interactions/receiving-and-responding
 */

// --- Interaction types ---

export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

export enum InteractionResponseType {
  /** ACK a PING */
  PONG = 1,
  /** Respond to an interaction with a message */
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  /** ACK an interaction and edit a response later (deferred) */
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  /** For components: ACK and edit the original message later */
  DEFERRED_UPDATE_MESSAGE = 6,
  /** For components: edit the original message */
  UPDATE_MESSAGE = 7,
}

// --- Application command option types ---

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}

// --- Structures ---

export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  global_name?: string;
  avatar?: string;
}

export interface DiscordMember {
  user?: DiscordUser;
  nick?: string;
  avatar?: string;
  roles: string[];
  permissions: string;
}

export interface ApplicationCommandOptionData {
  name: string;
  type: ApplicationCommandOptionType;
  value?: string | number | boolean;
  options?: ApplicationCommandOptionData[];
}

export interface ApplicationCommandData {
  id: string;
  name: string;
  type?: number;
  options?: ApplicationCommandOptionData[];
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  data?: ApplicationCommandData;
  token: string;
  version?: number;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
}

// --- Response structures ---

export interface InteractionResponseData {
  content?: string;
  flags?: number;
  embeds?: unknown[];
}

export interface InteractionResponse {
  type: InteractionResponseType;
  data?: InteractionResponseData;
}

// --- Pub/Sub payloads ---

/**
 * Payload published to 'write-pixel-requests' for /draw commands.
 * Must match the PixelPayload interface in write-pixels-worker.
 */
export interface PixelCommandPayload {
  userId: string;
  username: string;
  avatarUrl?: string;
  x: number;
  y: number;
  color: number;
  interactionToken: string;
  applicationId: string;
}

/**
 * Payload published to 'discord-cmd-requests' for non-draw commands.
 */
export interface DiscordCommandPayload {
  command: 'snapshot' | 'session' | 'canvas' | 'clear' | 'resize' | 'lock' | 'unlock' | 'set_cooldown';
  action?: 'start' | 'pause' | 'reset';
  width?: number;
  height?: number;
  cooldownSeconds?: number;
  userId: string;
  username: string;
  isAdmin: boolean;
  interactionToken: string;
  applicationId: string;
  guildId?: string;
  channelId?: string;
}

// --- Color palette (matches legacy discord.js bot) ---

export const COLOR_MAP: Record<string, number> = {
  white: 0xffffff,
  light_gray: 0xe4e4e4,
  gray: 0x888888,
  black: 0x222222,
  pink: 0xffa7d1,
  red: 0xe50000,
  orange: 0xe59500,
  brown: 0xa06a42,
  yellow: 0xe5d900,
  light_green: 0x94e044,
  green: 0x02be01,
  aqua: 0x00d3dd,
  blue: 0x0083c7,
  dark_blue: 0x0000ea,
  purple: 0xcf6ee4,
  dark_purple: 0x820080,
};

/** Discord interaction response flag for ephemeral messages (only visible to the invoker). */
export const EPHEMERAL_FLAG = 1 << 6;

/** Discord admin permission bit (ADMINISTRATOR). */
export const ADMINISTRATOR_PERMISSION = BigInt(0x8);
