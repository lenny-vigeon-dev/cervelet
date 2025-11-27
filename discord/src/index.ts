import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import "./server";

import type { Command } from "./types/discord";
interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

config();

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN is not defined in .env");
}

const client: ExtendedClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  let commandModule = require(filePath);

  if (commandModule.default) {
    commandModule = commandModule.default;
  }

  if ("data" in commandModule && "execute" in commandModule) {
    client.commands.set(commandModule.data.name, commandModule);
    console.log(`Loaded command: ${commandModule.data.name}`);
  } else {
    console.warn(`⚠️ Command at ${filePath} is missing required properties.`);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log("Interaction received:", interaction.commandName);

  const command = client.commands.get(interaction.commandName);
  console.log("Resolved command =", command ? "OK" : "NOT FOUND");

  if (!command) {
    console.error(`No command found for: ${interaction.commandName}`);
    return;
  }

  try {
    console.log(`Executing command: ${interaction.commandName}`);
    await command.execute(interaction);
    console.log("Command finished successfully");
  } catch (error) {
    console.error("Error in execute():", error);
    const errorMessage = "❌ An error occurred while executing this command.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
