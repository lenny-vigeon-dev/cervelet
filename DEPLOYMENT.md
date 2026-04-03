# Deployment Guide

Complete guide for deploying all PixelHub services to Google Cloud Platform.

## Prerequisites

- GCP project with billing enabled (e.g. `serverless-488811`)
- `gcloud` CLI installed and authenticated
- Terraform installed (>= 1.0)
- `pnpm` installed
- Docker installed (for local image builds)
- Discord application created at [Discord Developer Portal](https://discord.com/developers/applications)

```bash
gcloud auth login
gcloud config set project serverless-488811
gcloud auth application-default login
```

## Full Deployment (Step by Step)

### 1. Push Secrets to GCP Secret Manager

Create a `.env.local` file at the project root with your credentials, then push them:

```bash
node scripts/push-secrets.js
```

This pushes Discord tokens, Firebase config, and API keys to Secret Manager. **Never commit `.env.local` to git.**

### 2. Deploy Infrastructure with Terraform

```bash
cd infrastructure/terraform
terraform init
terraform plan    # Review what will be created
terraform apply   # Deploy all infrastructure
```

This creates:
- Firestore database with PITR and composite indexes
- 4 Pub/Sub topics + 3 push subscriptions + 3 DLQ topics
- API Gateway with OpenAPI spec routing to cf-proxy
- Cloud Storage bucket for canvas snapshots
- Secret Manager secret shells
- Service accounts with least-privilege IAM
- Monitoring alert policies and dashboard (optional)

Save the outputs:
```bash
terraform output   # Shows Cloud Run URLs, API Gateway URL, etc.
```

### 3. Deploy Firestore Rules and Indexes

```bash
# From project root
./scripts/deploy-db.sh

# Or individually:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Build and Deploy Backend Proxy (cf-proxy)

```bash
cd backend
pnpm install && pnpm build

# Option A: Cloud Build (recommended)
gcloud builds submit --config cloudbuild.yaml

# Option B: Manual Docker build + deploy
docker build -t europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/cf-proxy:latest .
docker push europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/cf-proxy:latest
gcloud run deploy cf-proxy --image=europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/cf-proxy:latest --region=europe-west1
```

### 5. Build and Deploy Workers

Each worker is an independent service. Build and deploy each:

```bash
# write-pixels-worker
cd backend/src/functions/write-pixels-worker
pnpm install && pnpm build
docker build -t europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/write-pixels-worker:latest .
docker push europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/write-pixels-worker:latest
gcloud run deploy write-pixels-worker --image=europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/write-pixels-worker:latest --region=europe-west1

# discord-cmd-worker
cd backend/src/functions/discord-cmd-worker
pnpm install && pnpm build
docker build -t europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/discord-cmd-worker:latest .
docker push europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/discord-cmd-worker:latest
gcloud run deploy discord-cmd-worker --image=europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/discord-cmd-worker:latest --region=europe-west1

# canvas-snapshot-generator
cd backend/src/functions/canvas-snapshot-generator
pnpm install && pnpm build
docker build -t europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/canvas-snapshot-generator:latest .
docker push europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/canvas-snapshot-generator:latest
gcloud run deploy canvas-snapshot-generator --image=europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/canvas-snapshot-generator:latest --region=europe-west1

# NOTE: firebase-auth-token is no longer a standalone service.
# Auth token minting is handled by cf-proxy (POST /auth/firebase-token).
# Deploy cf-proxy instead (see Step 2 above).
```

### 6. Build and Deploy Frontend

```bash
cd frontend
pnpm install

# Set build-time environment variables in .env.local:
#   NEXT_PUBLIC_API_URL=https://<your-api-gateway-url>
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID=serverless-488811
#   NEXT_PUBLIC_FIREBASE_API_KEY=<your-firebase-api-key>
#   NEXT_PUBLIC_CANVAS_SNAPSHOT_URL=https://storage.googleapis.com/serverless-488811-canvas-snapshots/canvas/latest.png
#   NEXT_PUBLIC_DISCORD_CLIENT_ID=<your-discord-client-id>

pnpm build

# Option A: Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Option B: Manual
docker build -t europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/pixelhub-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=<your-api-gateway-url> \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=serverless-488811 \
  .
docker push europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/pixelhub-frontend:latest
gcloud run deploy pixelhub-frontend --image=europe-west1-docker.pkg.dev/serverless-488811/cloud-run-source-deploy/pixelhub-frontend:latest --region=europe-west1 --allow-unauthenticated
```

### 7. Configure Discord Bot

1. In the [Discord Developer Portal](https://discord.com/developers/applications), set the **Interactions Endpoint URL** to:
   ```
   https://<your-api-gateway-url>/discord/interactions
   ```
2. Register slash commands using the deploy script or manually via Discord API.
3. Invite the bot to your server with the `applications.commands` scope.

### 8. Enable Scheduled Snapshots (Optional)

```bash
cd infrastructure/terraform

# Update terraform.tfvars:
#   enable_snapshot_scheduler = true

terraform apply
```

## Verification

After deployment, verify each component:

```bash
# API Gateway health check
curl https://<api-gateway-url>/health -H "x-api-key: <your-api-key>"

# Check Cloud Run services
gcloud run services list --region=europe-west1

# Verify Pub/Sub subscriptions
gcloud pubsub subscriptions list

# Test snapshot generation
curl -X POST https://<snapshot-generator-url>/generate

# Check Cloud Storage for snapshots
gsutil ls gs://serverless-488811-canvas-snapshots/canvas/

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=20 --format=json
```

## Architecture Reference

```
Discord / Web Client
        |
        v
  [API Gateway] -----> [cf-proxy (NestJS on Cloud Run)]
                              |
                              +---> Pub/Sub [write-pixel-requests]  ---> [write-pixels-worker]  ---> Firestore
                              +---> Pub/Sub [discord-cmd-requests]  ---> [discord-cmd-worker]   ---> Discord API
                              +---> Pub/Sub [snapshot-requests]     ---> [canvas-snapshot-generator] ---> Cloud Storage

  [Frontend (Next.js on Cloud Run)] ---> Firestore (real-time onSnapshot)
                                    ---> /auth/firebase-token ---> [cf-proxy (POST /auth/firebase-token)]
```

## Per-Service Documentation

- [cf-proxy Deployment](docs/deploy_cf_proxy.md)
- [Cloud Storage Setup](docs/cloud-storage-setup.md)
- [Firebase Auth + Discord](docs/firebase-auth-discord-setup.md)
- [Real-time Canvas](docs/realtime-canvas-setup.md)
- [DNS Setup](docs/DNS-SETUP-GUIDE.md)
