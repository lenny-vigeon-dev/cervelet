import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({ projectId: process.env.GCLOUD_PROJECT_ID });
const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'write-pixels-topic';

export const data = new SlashCommandBuilder()
  .setName('draw')
  .setDescription('Draw a pixel on the canvas')
  .addIntegerOption((opt) => opt.setName('x').setDescription('X coord').setRequired(true))
  .addIntegerOption((opt) => opt.setName('y').setDescription('Y coord').setRequired(true))
  .addStringOption((opt) =>
    opt.setName('color').setDescription('Color hex, ex: #ff0000 or ff0000').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  console.log('[/draw] Command triggered by', interaction.user?.id);

  await interaction.deferReply({ ephemeral: true });

  const x = interaction.options.getInteger('x', true);
  const y = interaction.options.getInteger('y', true);
  const colorStr = interaction.options.getString('color', true);

  if (x < 0 || y < 0) {
    await interaction.editReply({ content: '❌ Les coordonnées doivent être positives.' });
    return;
  }

  let colorNum: number;
  try {
    colorNum = parseInt(colorStr.replace(/^#/, ''), 16);
    if (Number.isNaN(colorNum) || colorNum < 0) throw new Error('invalid color');
  } catch (err) {
    await interaction.editReply({ content: "❌ Format de couleur invalide. Utilisez '#rrggbb' ou 'rrggbb'." });
    return;
  }

  const payload = {
    userId: interaction.user.id,
    x,
    y,
    color: colorNum,
    interactionToken: interaction.token,
    applicationId: interaction.applicationId ?? interaction.client.application?.id ?? '',
  };

  const dataBuffer = Buffer.from(JSON.stringify(payload));

  try {
    await pubsub.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });

    console.log('[/draw] Published message to', TOPIC_NAME, 'payload:', payload);
    await interaction.editReply({ content: '✅ Requête envoyée, le pixel sera placé si le cooldown est OK.' });
  } catch (err) {
    console.error('[/draw] Error publishing to Pub/Sub:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);

    await interaction.editReply({ content: "❌ Échec lors de l'envoi de la requête. Réessayez plus tard (voir logs serveur pour les détails)." });
  }
}
