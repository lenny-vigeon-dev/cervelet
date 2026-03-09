export const CONFIG = {
  port: parseInt(process.env['PORT'] || '8080', 10),

  gcpProject:
    process.env['GCP_PROJECT_ID'] ||
    process.env['GOOGLE_CLOUD_PROJECT'] ||
    'serverless-488811',

  canvasId: process.env['CANVAS_ID'] || 'main-canvas',

  snapshotUrl:
    process.env['CANVAS_SNAPSHOT_URL'] ||
    'https://storage.googleapis.com/serverless-488811-canvas-snapshots/canvas/latest.png',

  snapshotGeneratorUrl:
    process.env['SNAPSHOT_GENERATOR_URL'] || '',

  discordApiBase: 'https://discord.com/api/v10',
} as const;
