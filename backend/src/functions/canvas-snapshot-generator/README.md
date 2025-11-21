# Canvas Snapshot Generator Cloud Function

This Cloud Function generates snapshots of the r/place canvas and uploads them to Cloud Storage.

## Features

- Fetches all pixels from Firestore
- Renders the canvas as a PNG image using the `canvas` library
- Uploads the snapshot to Cloud Storage:
  - `canvas/latest.png` - Always contains the most recent snapshot
  - `canvas/historical/TIMESTAMP.png` - Timestamped historical snapshots
- Can be triggered by Cloud Scheduler, HTTP requests, or Pub/Sub

## Development

### Install dependencies

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Local development

```bash
pnpm start:dev
```

## Deployment

### Prerequisites

1. Ensure Cloud Storage bucket is created (via Terraform)
2. Ensure service account has necessary permissions
3. Set environment variables in `.env.yaml`

### Deploy to GCP

```bash
# Deploy as HTTP-triggered Cloud Function (Gen 2)
gcloud functions deploy canvas-snapshot-generator \
  --gen2 \
  --runtime=nodejs22 \
  --region=europe-west1 \
  --source=. \
  --entry-point=generateSnapshot \
  --trigger-http \
  --service-account=SERVICE_ACCOUNT_EMAIL \
  --set-env-vars GCP_PROJECT_ID=serverless-tek89,CANVAS_SNAPSHOTS_BUCKET=serverless-tek89-canvas-snapshots \
  --memory=512MB \
  --timeout=540s

# Or use the npm script
pnpm deploy
```

### Trigger manually

```bash
# Trigger via HTTP
curl -X POST https://REGION-PROJECT_ID.cloudfunctions.net/canvas-snapshot-generator

# With specific canvas ID
curl -X POST "https://REGION-PROJECT_ID.cloudfunctions.net/canvas-snapshot-generator?canvasId=main-canvas"
```

## Environment Variables

- `GCP_PROJECT_ID` - GCP project ID (default: serverless-tek89)
- `CANVAS_SNAPSHOTS_BUCKET` - Cloud Storage bucket name (default: serverless-tek89-canvas-snapshots)

## Cost Optimization

- Function uses minimal memory (512MB)
- Timeout set to 9 minutes for large canvases
- Batched pixel fetching for better performance
- Snapshots are cached with appropriate `Cache-Control` headers

## Monitoring

View logs:

```bash
gcloud functions logs read canvas-snapshot-generator --region=europe-west1 --limit=50
```

## Testing

The function can be tested locally or on GCP:

1. **Local testing**: Run `pnpm start:dev` and send HTTP requests
2. **GCP testing**: Deploy and trigger via URL or Cloud Console
