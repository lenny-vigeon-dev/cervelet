import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

config();

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN missing');
if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID missing');

const guildId = process.env.GUILD_ID;

const commands: unknown[] = [];
const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`Loaded for deployment: ${command.data.name}`);
  } else {
    console.warn(`⚠️ Command ${file} is missing 'data' property.`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  try {
    if (guildId) {
      console.log(`Deploying commands to guild ${guildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId),
        { body: commands }
      );
      console.log('Guild commands deployed ✔️');
    } else {
      console.log('Deploying GLOBAL commands...');
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
        body: commands,
      });
      console.log('Global commands deployed ✔️');
    }
  } catch (error) {
    console.error('❌ Deployment error:', error instanceof Error ? error.message : JSON.stringify(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

deploy();
