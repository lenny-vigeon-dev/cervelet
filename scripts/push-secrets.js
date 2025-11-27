#!/usr/bin/env node
/**
 * Push selected environment variables to Google Secret Manager.
 *
 * Usage:
 *   node scripts/push-secrets.js [path-to-env-file] [gcp-project-id]
 *
 * Defaults:
 *   env file: ../frontend/.env.local
 *   project:  env GCP_PROJECT || GOOGLE_CLOUD_PROJECT || serverless-tek89
 *
 * Secrets are created if missing, then a new version is added for each key.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envFile =
  process.argv[2] || path.join(__dirname, '..', 'frontend', '.env.local');
const project =
  process.argv[3] ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  'serverless-tek89';

const TARGET_KEYS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_DISCORD_CLIENT_ID',
  'NEXT_PUBLIC_DISCORD_REDIRECT_URI',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_CANVAS_SNAPSHOT_URL',
  'DISCORD_CLIENT_SECRET'
];

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function ensureSecret(name, value) {
  try {
    execSync(`gcloud secrets describe ${name} --project=${project} --quiet`, {
      stdio: 'ignore',
    });
  } catch {
    console.log(`Creating secret ${name}...`);
    execSync(
      `gcloud secrets create ${name} --replication-policy=automatic --project=${project} --quiet`,
      { stdio: 'inherit' },
    );
  }

  console.log(`Adding new version for ${name}...`);
  execSync(
    `gcloud secrets versions add ${name} --data-file=- --project=${project} --quiet`,
    { input: value, stdio: ['pipe', 'inherit', 'inherit'] },
  );
}

function main() {
  if (!fs.existsSync(envFile)) {
    console.error(`Env file not found: ${envFile}`);
    process.exit(1);
  }

  const env = parseEnv(envFile);

  for (const key of TARGET_KEYS) {
    const value = env[key];
    if (!value) {
      console.warn(`Skipping ${key}: no value found in ${envFile}`);
      continue;
    }
    ensureSecret(key, value);
  }

  console.log('✅ Secrets pushed to Secret Manager');
}

main();
