import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Affiche la liste des commandes disponibles.');

export async function execute(interaction: ChatInputCommandInteraction) {
    console.log('[/help] Command triggered by', interaction.user?.id);
    const helpMessage = `
Voici les commandes disponibles :
/help - Affiche ce message d'aide.
/draw x:<coordonnée X> y:<coordonnée Y> color:<couleur hex> - Dessine un pixel sur la toile aux coordonnées spécifiées avec la couleur donnée.
/allo - Renvoie "à l'huile" dans le channel courant.
/send channel:<canal> message:<message> - Envoie un message dans le canal choisi.
`;

    try {
        await interaction.reply(helpMessage);
        console.log('[/help] Help message sent successfully');
    } catch (err) {
        console.error('[/help] Error while sending help message:', err);
    }
}