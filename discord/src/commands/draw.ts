/**
 * /draw command
 * Publishes a pixel draw request to Pub/Sub using the 16-color r/Place palette.
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { PubSub } from "@google-cloud/pubsub";

const pubsub = new PubSub({ projectId: process.env.GCLOUD_PROJECT_ID });
const TOPIC_NAME = process.env.PUBSUB_TOPIC || "write-pixels-topic";
const MAX_X = process.env.CANVAS_MAX_X ? parseInt(process.env.CANVAS_MAX_X) : 1000;
const MAX_Y = process.env.CANVAS_MAX_Y ? parseInt(process.env.CANVAS_MAX_Y) : 1000;

const COLOR_MAP: Record<string, string> = {
  white: "FFFFFF",
  light_gray: "E4E4E4",
  gray: "888888",
  black: "222222",
  pink: "FFA7D1",
  red: "E50000",
  orange: "E59500",
  brown: "A06A42",
  yellow: "E5D900",
  light_green: "94E044",
  green: "02BE01",
  aqua: "00D3DD",
  blue: "0083C7",
  dark_blue: "0000EA",
  purple: "CF6EE4",
  dark_purple: "820080",
};

const COLOR_CHOICES = Object.keys(COLOR_MAP).map((key) => ({
  name: key,
  value: key,
}));

export const data = new SlashCommandBuilder()
  .setName("draw")
  .setDescription("Draw a pixel on the canvas.")
  .addIntegerOption((opt) =>
    opt.setName("x").setDescription("X coordinate").setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName("y").setDescription("Y coordinate").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("color")
      .setDescription("Color (16-color r/Place palette)")
      .addChoices(...COLOR_CHOICES)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  console.log("[/draw] Triggered by", interaction.user.id);

  await interaction.deferReply({ ephemeral: true });

  const x = interaction.options.getInteger("x", true);
  const y = interaction.options.getInteger("y", true);
  const colorKey = interaction.options.getString("color", true);

  if (x < 0 || x >= MAX_X || y < 0 || y >= MAX_Y) {
    await interaction.editReply(`❌ Coordinates must be between 0-${MAX_X - 1} for X and 0-${MAX_Y - 1} for Y.`);
    return;
  }

  const hex = COLOR_MAP[colorKey];
  if (!hex) {
    await interaction.editReply("❌ Invalid color.");
    return;
  }

  const colorNum = parseInt(hex, 16);

  const payload = {
    userId: interaction.user.id,
    x,
    y,
    color: colorNum,
    interactionToken: interaction.token,
    applicationId:
      interaction.applicationId ?? interaction.client.application?.id ?? "",
  };

  try {
    await pubsub.topic(TOPIC_NAME).publishMessage({
      data: Buffer.from(JSON.stringify(payload)),
    });

    console.log("[/draw] Published pixel:", payload);

    await interaction.editReply(
      "✅ Pixel request sent. The pixel will be placed if cooldown allows it."
    );
  } catch (error) {
    console.error("[/draw] Pub/Sub error:", error);
    await interaction.editReply(
      "❌ Failed to publish the pixel request. Please try again later."
    );
  }
}
