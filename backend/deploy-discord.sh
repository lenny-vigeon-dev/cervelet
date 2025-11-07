#!/bin/bash
set -e
set -o pipefail

FUNCTION_NAME="discord-acknowledge"
FUNCTION_FOLDER="discord"  # 👈 dossier dans src/functions/
ENTRY_POINT="discordAcknowledge"
REGION="europe-west1"
RUNTIME="nodejs20"
BACKEND_DIR="$(dirname "$0")"
DIST_DIR="$BACKEND_DIR/dist"
ENV_FILE="$BACKEND_DIR/.env"

# Load .env
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found"
  exit 1
fi
export $(grep -v '^#' "$ENV_FILE" | xargs)

if [ -z "$DISCORD_PUBLIC_KEY" ]; then
  echo "❌ DISCORD_PUBLIC_KEY is missing in .env"
  exit 1
fi

echo "🏗️  Building project..."
cd "$BACKEND_DIR"
pnpm install --frozen-lockfile
pnpm run build

echo "🧩 Preparing deployment structure..."
# Copy package.json (required by GCP)
cp "$BACKEND_DIR/package.json" "$DIST_DIR/package.json"
cp "$BACKEND_DIR/pnpm-lock.yaml" "$DIST_DIR/pnpm-lock.yaml" || true

# Generate a lightweight index.js for GCP
echo "module.exports = require('./functions/$FUNCTION_FOLDER/index');" > "$DIST_DIR/index.js"

echo "🚀 Deploying Cloud Function '$FUNCTION_NAME'..."
gcloud functions deploy "$FUNCTION_NAME" \
  --gen2 \
  --runtime="$RUNTIME" \
  --region="$REGION" \
  --source="$DIST_DIR" \
  --entry-point="$ENTRY_POINT" \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DISCORD_PUBLIC_KEY=$DISCORD_PUBLIC_KEY"

echo "✅ Deployment complete!"
gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --format="value(serviceConfig.uri)"