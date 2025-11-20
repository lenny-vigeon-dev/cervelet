import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("send")
  .setDescription("Send a message into a chosen channel")
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("Channel to send to")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("message")
      .setDescription("Message to send")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  console.log("🟡 /send called");

  const channel = interaction.options.getChannel("channel", true);
  const msg = interaction.options.getString("message", true);

  console.log("➡ Channel selected:", channel?.id);
  console.log("➡ Message:", msg);

  if (!channel || !("send" in channel)) {
    console.log("❌ Channel is not sendable");
    return interaction.reply({
      content: "❌ This channel can't receive messages.",
      ephemeral: true,
    });
  }

  try {
    console.log("📤 Sending message...");
    await (channel as TextChannel).send(msg);
    console.log("✔ Message sent!");

    await interaction.reply({
      content: `✅ Message sent to <#${channel.id}>`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("❌ Error while sending:", err);

    return interaction.reply({
      content: "❌ Failed to send the message.",
      ephemeral: true,
    });
  }
}
