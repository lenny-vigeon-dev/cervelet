# Quick Deployment Guide

This guide walks you through deploying the Cloud Storage optimization for your r/place canvas application.

## Prerequisites

- GCP project set up (`serverless-tek89`)
- Terraform installed and configured
- `gcloud` CLI installed and authenticated
- Firestore database deployed

## Quick Start (5 Steps)

### 1. Deploy Cloud Storage Bucket (1 minute)

```bash
cd infrastructure/terraform
terraform init
terraform apply
```

Save the output:
```bash
terraform output latest_canvas_snapshot_url
# Example: https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png
```

### 2. Deploy Snapshot Generator Function (3 minutes)

```bash
cd backend/src/functions/canvas-snapshot-generator

# Install and build
pnpm install
pnpm build

# Deploy
gcloud functions deploy canvas-snapshot-generator \
  --gen2 \
  --runtime=nodejs22 \
  --region=europe-west1 \
  --source=. \
  --entry-point=generateSnapshot \
  --trigger-http \
  --service-account=$(cd ../../../../infrastructure/terraform && terraform output -raw snapshot_service_account_email) \
  --set-env-vars GCP_PROJECT_ID=serverless-tek89,CANVAS_SNAPSHOTS_BUCKET=serverless-tek89-canvas-snapshots \
  --memory=512MB \
  --timeout=540s
```

Save the function URL:
```bash
gcloud functions describe canvas-snapshot-generator --region=europe-west1 --gen2 --format='value(serviceConfig.uri)'
```

### 3. Test the Function (30 seconds)

```bash
# Generate your first snapshot
gcloud functions call canvas-snapshot-generator --region=europe-west1 --gen2

# Verify it was created
gsutil ls gs://serverless-tek89-canvas-snapshots/canvas/
```

### 4. Enable Scheduled Snapshots (1 minute)

```bash
cd infrastructure/terraform

# Update terraform.tfvars with your function URL
cat >> terraform.tfvars << EOF
enable_snapshot_scheduler = true
snapshot_function_url = "PASTE_YOUR_FUNCTION_URL_HERE"
EOF

# Deploy scheduler
terraform apply
```

### 5. Update Frontend (30 seconds)

```bash
cd frontend

# Add snapshot URL to environment
echo "NEXT_PUBLIC_CANVAS_SNAPSHOT_URL=https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png" >> .env.local

# Rebuild frontend
pnpm build
```

**Use the optimized component in `app/page.tsx`:**
```tsx
import { PixelCanvasOptimized as PixelCanvas } from "@/components/pixel-canvas-optimized";
```

## Verification

1. **Check snapshot URL**: Visit `https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png` in your browser
2. **Monitor scheduler**: `gcloud scheduler jobs describe pixelhub-canvas-snapshot --location=europe-west1`
3. **View logs**: `gcloud functions logs read canvas-snapshot-generator --region=europe-west1 --limit=10`

## What You Get

- **99.98% cost reduction** for canvas loading
- **10-100x faster** initial page load
- **Automatic snapshots** every 5 minutes
- **Real-time updates** overlaid on snapshots
- **Historical snapshots** for timelapses

## Need Help?

See the full documentation:
- [Cloud Storage Setup Guide](docs/cloud-storage-setup.md) - Complete guide with troubleshooting
- [Architecture Overview](README.md#architecture) - Understanding the system design

## Cost Estimate

For 100k daily users with a 1000x1000 canvas:
- **Before**: ~$60,000/day (Firestore reads)
- **After**: ~$9/day (Cloud Storage + Firestore updates)
- **Savings**: 99.985%
