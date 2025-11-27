import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  AttachmentBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("snapshot")
  .setDescription("Fetch and display the latest canvas snapshot.");

export async function execute(interaction: ChatInputCommandInteraction) {
  console.log("[/snapshot] Triggered by:", interaction.user.id);

  await interaction.deferReply({ ephemeral: false });

  const SNAPSHOT_URL = process.env.CANVAS_SNAPSHOT_URL;

  if (!SNAPSHOT_URL) {
    console.error("[/snapshot] Missing environment variable: CANVAS_SNAPSHOT_URL");
    await interaction.editReply(
      "❌ Internal error: `CANVAS_SNAPSHOT_URL` is not configured."
    );
    return;
  }

  try {
    console.log("[/snapshot] Fetching snapshot from:", SNAPSHOT_URL);

    const res = await fetch(SNAPSHOT_URL);

    if (!res.ok) {
      console.error("[/snapshot] HTTP error:", res.status);
      await interaction.editReply(
        `❌ Failed to fetch snapshot (HTTP ${res.status}).`
      );
      return;
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    const attachment = new AttachmentBuilder(buffer, {
      name: "snapshot.png",
    });

    await interaction.editReply({
      content: "Here is the latest canvas snapshot:",
      files: [attachment],
    });

    console.log("[/snapshot] Snapshot sent successfully.");
  } catch (error) {
    console.error("[/snapshot] Unexpected error:", error);
    await interaction.editReply(
      "❌ An unexpected error occurred while fetching the snapshot."
    );
  }
}
