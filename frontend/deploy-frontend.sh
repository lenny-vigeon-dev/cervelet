#!/usr/bin/env bash
set -euo pipefail

IMAGE="europe-west1-docker.pkg.dev/serverless-tek89/cloud-run-source-deploy/frontend:manual"
REGION="europe-west1"
SERVICE="frontend"
PROJECT="${PROJECT:-serverless-tek89}"

echo "Loading .env.local..."
if [[ ! -f .env.local ]]; then
  echo "❌ Missing .env.local"
  exit 1
fi
set -a
source .env.local
set +a

echo "🚧 Building image with Cloud Build (cloudbuild.yaml)..."

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE="$IMAGE",\
_NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL",\
_NEXT_PUBLIC_DISCORD_CLIENT_ID="$NEXT_PUBLIC_DISCORD_CLIENT_ID",\
_NEXT_PUBLIC_DISCORD_REDIRECT_URI="$NEXT_PUBLIC_DISCORD_REDIRECT_URI",\
_NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY",\
_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",\
_NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID",\
_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",\
_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",\
_NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID",\
_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",\
_NEXT_PUBLIC_CANVAS_SNAPSHOT_URL="$NEXT_PUBLIC_CANVAS_SNAPSHOT_URL" \
  --project "$PROJECT"

echo "🚀 Deploying to Cloud Run..."

gcloud run deploy "$SERVICE" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated \
  --project "$PROJECT" \
  --set-env-vars DISCORD_CLIENT_SECRET="$DISCORD_CLIENT_SECRET"

echo "🎉 Deployment completed successfully!"
