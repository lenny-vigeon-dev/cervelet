import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('allo')
  .setDescription('Renvoie "à l\'huile" dans le channel courant.');

export async function execute(interaction: ChatInputCommandInteraction) {
  console.log('[/allo] Command triggered');
  console.log('[/allo] Interaction received from user:', interaction.user?.id);

  try {
    console.log('[/allo] Attempting to reply...');
    await interaction.reply("à l'huile");
    console.log('[/allo] Reply sent successfully');
  } catch (err) {
    console.error('[/allo] Error while replying:', err);
  }
}