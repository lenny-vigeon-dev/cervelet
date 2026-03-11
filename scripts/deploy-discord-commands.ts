/**
 * Register Discord slash commands via the REST API.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... CLIENT_ID=... npx ts-node scripts/deploy-discord-commands.ts
 *   GUILD_ID=... (optional, for guild-specific deployment during development)
 *
 * Accepts DISCORD_BOT_TOKEN (preferred) or DISCORD_TOKEN for backward compat.
 *
 * This script does NOT use discord.js -- it calls the Discord REST API directly
 * with plain fetch, keeping the project serverless-compliant.
 */

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN) throw new Error('DISCORD_BOT_TOKEN (or DISCORD_TOKEN) is required');
if (!CLIENT_ID) throw new Error('CLIENT_ID is required');

const API_BASE = 'https://discord.com/api/v10';

// --- Command definitions ---

const commands = [
  {
    name: 'draw',
    description: 'Place a pixel on the canvas',
    options: [
      {
        name: 'x',
        description: 'X coordinate',
        type: 4, // INTEGER
        required: true,
      },
      {
        name: 'y',
        description: 'Y coordinate',
        type: 4, // INTEGER
        required: true,
      },
      {
        name: 'color',
        description: 'Color (16-color r/Place palette)',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'white', value: 'white' },
          { name: 'light_gray', value: 'light_gray' },
          { name: 'gray', value: 'gray' },
          { name: 'black', value: 'black' },
          { name: 'pink', value: 'pink' },
          { name: 'red', value: 'red' },
          { name: 'orange', value: 'orange' },
          { name: 'brown', value: 'brown' },
          { name: 'yellow', value: 'yellow' },
          { name: 'light_green', value: 'light_green' },
          { name: 'green', value: 'green' },
          { name: 'aqua', value: 'aqua' },
          { name: 'blue', value: 'blue' },
          { name: 'dark_blue', value: 'dark_blue' },
          { name: 'purple', value: 'purple' },
          { name: 'dark_purple', value: 'dark_purple' },
        ],
      },
    ],
  },
  {
    name: 'snapshot',
    description: 'Generate and display the latest canvas snapshot',
  },
  {
    name: 'canvas',
    description: 'View canvas information (size, status, pixel count)',
  },
  {
    name: 'session',
    description: 'Manage the canvas session (admin only)',
    options: [
      {
        name: 'action',
        description: 'Session action',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Start', value: 'start' },
          { name: 'Pause', value: 'pause' },
          { name: 'Reset', value: 'reset' },
        ],
      },
    ],
  },
  {
    name: 'clear',
    description: 'Clear all pixels from the canvas (admin only)',
  },
  {
    name: 'resize',
    description: 'Resize the canvas (admin only)',
    options: [
      {
        name: 'width',
        description: 'New canvas width',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 10000,
      },
      {
        name: 'height',
        description: 'New canvas height',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 10000,
      },
    ],
  },
  {
    name: 'lock',
    description: 'Lock the canvas to prevent pixel placement (admin only)',
  },
  {
    name: 'unlock',
    description: 'Unlock the canvas to allow pixel placement (admin only)',
  },
  {
    name: 'set_cooldown',
    description: 'Set the pixel placement cooldown in seconds (admin only)',
    options: [
      {
        name: 'seconds',
        description: 'Cooldown duration in seconds',
        type: 4, // INTEGER
        required: true,
        min_value: 0,
        max_value: 3600,
      },
    ],
  },
  {
    name: 'help',
    description: 'Show available commands',
  },
  {
    name: 'allo',
    description: "Renvoie \"a l'huile\" dans le channel courant.",
  },
];

// --- Deploy ---

async function deploy() {
  const url = GUILD_ID
    ? `${API_BASE}/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
    : `${API_BASE}/applications/${CLIENT_ID}/commands`;

  const scope = GUILD_ID ? `guild ${GUILD_ID}` : 'global';
  console.log(`Deploying ${commands.length} commands (${scope})...`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Failed to deploy commands: ${response.status} ${response.statusText}`);
    console.error(body);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`Deployed ${(result as unknown[]).length} commands successfully.`);

  for (const cmd of result as Array<{ name: string; id: string }>) {
    console.log(`  /${cmd.name} (${cmd.id})`);
  }
}

deploy().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
