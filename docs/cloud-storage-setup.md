# Cloud Storage Setup Guide

This guide explains how to set up Cloud Storage buckets for canvas snapshots to optimize performance and reduce costs in your r/place application.

## Table of Contents

1. [Why Cloud Storage?](#why-cloud-storage)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Steps](#deployment-steps)
4. [Testing](#testing)
5. [Cost Comparison](#cost-comparison)
6. [Troubleshooting](#troubleshooting)

## Why Cloud Storage?

For a r/place-like application, Cloud Storage provides several critical benefits:

### Performance
- **Fast initial load**: Load one image file instead of thousands of Firestore documents
- **CDN caching**: Images can be cached globally for instant access
- **Reduced API calls**: Fewer calls to Firestore = faster page loads

### Cost Optimization
Without Cloud Storage (1000x1000 canvas = 1M pixels):
- **Firestore reads**: 1M documents × $0.06 per 100k reads = **$6 per 100k page loads**

With Cloud Storage:
- **Image load**: ~500KB image × $0.12 per GB = **~$0.001 per 1k page loads** (with CDN)
- **Savings**: ~99.98% cost reduction for canvas loading

### Scalability
- Snapshots are generated periodically (e.g., every 5 minutes)
- No matter how many users visit, they all load the same cached snapshot
- Real-time updates overlay on top of the snapshot

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  User's Browser                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  1. Load snapshot from Cloud Storage (fast)     │   │
│  │  2. Subscribe to real-time updates (websocket)  │   │
│  │  3. Overlay new pixels on snapshot              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                     │                │
                     ▼                ▼
        ┌─────────────────┐  ┌──────────────┐
        │ Cloud Storage   │  │  Firestore   │
        │  (snapshots)    │  │  (pixels)    │
        └─────────────────┘  └──────────────┘
                     ▲                ▲
                     │                │
        ┌────────────┴────────────────┴────┐
        │  Cloud Function                   │
        │  (generates snapshots every 5min) │
        └───────────────────────────────────┘
                     ▲
                     │
        ┌────────────┴────────────┐
        │  Cloud Scheduler        │
        │  (triggers function)    │
        └─────────────────────────┘
```

## Deployment Steps

### Step 1: Deploy Cloud Storage Bucket

The Cloud Storage bucket is already configured in Terraform. Deploy it:

```bash
cd infrastructure/terraform

# Initialize Terraform (if not done already)
terraform init

# Review the changes
terraform plan

# Deploy the storage module
terraform apply
```

This will create:
- Cloud Storage bucket: `serverless-tek89-canvas-snapshots`
- Service account for snapshot generation
- Appropriate IAM permissions
- Lifecycle rules for snapshot retention

**Get the snapshot URL:**
```bash
terraform output latest_canvas_snapshot_url
```

### Step 2: Deploy the Snapshot Generator Cloud Function

Navigate to the function directory and deploy:

```bash
cd backend/src/functions/canvas-snapshot-generator

# Install dependencies
pnpm install

# Build the function
pnpm build

# Deploy to GCP
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
  --timeout=540s \
  --allow-unauthenticated=false
```

**Get the function URL:**
```bash
gcloud functions describe canvas-snapshot-generator \
  --region=europe-west1 \
  --gen2 \
  --format='value(serviceConfig.uri)'
```

### Step 3: Test the Function Manually

Trigger the function to generate your first snapshot:

```bash
# Get the function URL from step 2
FUNCTION_URL=$(gcloud functions describe canvas-snapshot-generator --region=europe-west1 --gen2 --format='value(serviceConfig.uri)')

# Trigger it (requires authentication)
gcloud functions call canvas-snapshot-generator \
  --region=europe-west1 \
  --gen2 \
  --data='{"canvasId":"main-canvas"}'
```

**Verify the snapshot was created:**
```bash
gsutil ls gs://serverless-tek89-canvas-snapshots/canvas/
```

You should see:
- `canvas/latest.png`
- `canvas/historical/TIMESTAMP.png`

### Step 4: Enable Cloud Scheduler

Update your Terraform variables to enable the scheduler:

```bash
cd infrastructure/terraform

# Create or edit terraform.tfvars
cat >> terraform.tfvars << EOF

# Cloud Storage Snapshot Configuration
enable_snapshot_scheduler = true
snapshot_function_url = "YOUR_FUNCTION_URL_FROM_STEP_2"
snapshot_schedule = "*/5 * * * *"  # Every 5 minutes
EOF

# Apply the changes
terraform apply
```

The scheduler will now trigger the snapshot function every 5 minutes.

### Step 5: Update Frontend Configuration

Add the snapshot URL to your frontend environment:

```bash
cd frontend

# Add to .env.local
echo "NEXT_PUBLIC_CANVAS_SNAPSHOT_URL=https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png" >> .env.local
```

### Step 6: Use the Optimized Canvas Component

You can now use the optimized canvas component in your frontend.

**Option A: Replace the existing component** (in `app/page.tsx`):
```tsx
// Change this:
import { PixelCanvas } from "@/components/pixel-canvas";

// To this:
import { PixelCanvasOptimized as PixelCanvas } from "@/components/pixel-canvas-optimized";
```

**Option B: Use both components** (gradual migration):
```tsx
<PixelCanvasOptimized snapshot={snapshot ?? undefined} useCloudStorage={true} />
```

The optimized component will:
1. Load the snapshot image from Cloud Storage (fast)
2. Fall back to pixel-by-pixel rendering if snapshot unavailable
3. Subscribe to real-time updates and overlay them

## Testing

### Test the Full Flow

1. **Place some pixels** via your frontend or API
2. **Wait for the scheduler** (max 5 minutes) or trigger manually
3. **Check the snapshot URL** in your browser:
   ```
   https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png
   ```
4. **Refresh your frontend** - it should load the snapshot image

### Test Real-time Updates

1. Open your frontend in two browser windows
2. Place a pixel in one window
3. Verify it appears in both windows (via the stream)

### Monitor Function Execution

```bash
# View function logs
gcloud functions logs read canvas-snapshot-generator \
  --region=europe-west1 \
  --limit=50

# View scheduler logs
gcloud scheduler jobs describe pixelhub-canvas-snapshot \
  --location=europe-west1
```

## Cost Comparison

### Scenario: 1000x1000 canvas with 100k page views per day

#### Without Cloud Storage
- Firestore reads: 1M pixels × 100k views = 100B reads
- Cost: 100B × ($0.06 / 100k) = **$60,000/day**

#### With Cloud Storage
- Snapshot storage: 500KB × $0.020/GB/month = **$0.00001/day**
- Snapshot generation: 288 executions/day × $0.0000004 = **$0.0001/day**
- Image bandwidth: 500KB × 100k views × $0.12/GB = **$6/day** (without CDN)
- Image bandwidth (with CDN): **~$0.60/day** (90% cache hit rate)
- **Total: ~$0.60/day** (99.999% savings)

### Firestore Costs (for real-time updates only)
- Average 10 pixels/minute = 14,400 pixels/day
- Firestore writes: 14,400 × $0.18 / 100k = **$0.026/day**
- Users reading updates: 100k users × 14,400 pixels × $0.06 / 100k = **$8.64/day**

**Total with Cloud Storage: ~$9.26/day vs $60,000/day**

## Troubleshooting

### Snapshot not loading in frontend

1. **Check if snapshot exists:**
   ```bash
   gsutil ls gs://serverless-tek89-canvas-snapshots/canvas/latest.png
   ```

2. **Verify public access:**
   ```bash
   curl -I https://storage.googleapis.com/serverless-tek89-canvas-snapshots/canvas/latest.png
   ```
   Should return `200 OK`

3. **Check CORS configuration:**
   ```bash
   gsutil cors get gs://serverless-tek89-canvas-snapshots
   ```

### Function failing to generate snapshot

1. **Check function logs:**
   ```bash
   gcloud functions logs read canvas-snapshot-generator --region=europe-west1 --limit=50
   ```

2. **Verify service account permissions:**
   ```bash
   gcloud projects get-iam-policy serverless-tek89 \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:pixelhub-snapshot-gen@*"
   ```

3. **Test function manually:**
   ```bash
   gcloud functions call canvas-snapshot-generator --region=europe-west1 --gen2
   ```

### Scheduler not triggering

1. **Check scheduler status:**
   ```bash
   gcloud scheduler jobs describe pixelhub-canvas-snapshot --location=europe-west1
   ```

2. **View scheduler logs:**
   ```bash
   gcloud scheduler jobs list --location=europe-west1
   ```

3. **Manually trigger:**
   ```bash
   gcloud scheduler jobs run pixelhub-canvas-snapshot --location=europe-west1
   ```

### High costs

1. **Reduce snapshot frequency:**
   - Change from every 5 minutes to every 15 minutes
   - Update `snapshot_schedule` in `terraform.tfvars`

2. **Enable CDN:**
   - Use Cloud CDN in front of Cloud Storage
   - Dramatically reduces bandwidth costs

3. **Adjust retention:**
   - Historical snapshots are kept for 30 days by default
   - Reduce via `storage_snapshot_retention_days` variable

## Next Steps

1. **Enable CDN** for even better performance
2. **Add monitoring** with Cloud Monitoring
3. **Set up alerts** for function failures
4. **Optimize snapshot schedule** based on traffic patterns
5. **Generate timelapses** from historical snapshots

## References

- [Cloud Storage Pricing](https://cloud.google.com/storage/pricing)
- [Cloud Functions Pricing](https://cloud.google.com/functions/pricing)
- [Cloud Scheduler Pricing](https://cloud.google.com/scheduler/pricing)
- [Firestore Pricing](https://cloud.google.com/firestore/pricing)
