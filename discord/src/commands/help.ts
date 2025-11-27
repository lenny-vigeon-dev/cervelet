import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Displays the list of available commands.');

export async function execute(interaction: ChatInputCommandInteraction) {
    console.log('[/help] Command triggered by', interaction.user?.id);
    // TODO: Dynamically generate the help message from the registered commands.
    const helpMessage = `
Here are the available commands:
/help - Displays this help message.
/draw x:<X coordinate> y:<Y coordinate> color:<hex color> - Draws a pixel on the canvas at the specified coordinates with the given color.
/allo - Replies "à l'huile" in the current channel.
/send channel:<channel> message:<message> - Sends a message in the selected channel.
`;

    try {
        await interaction.reply(helpMessage);
        console.log('[/help] Help message sent successfully');
    } catch (err) {
        console.error('[/help] Error while sending help message:', err);
    }
}