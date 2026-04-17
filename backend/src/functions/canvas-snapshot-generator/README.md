# Canvas Snapshot Generator Cloud Function

This Cloud Function generates snapshots of the r/place canvas and uploads them to Cloud Storage.

## Features

- Fetches all pixels from Firestore
- Renders the canvas as a PNG image using the `canvas` library
- Uploads the snapshot to Cloud Storage:
  - `canvas/latest.png` - Always contains the most recent snapshot
  - `canvas/historical/TIMESTAMP.png` - Timestamped historical snapshots
- Triggered exclusively via Pub/Sub push on the `snapshot-requests` topic (no direct HTTP entry point; subject compliance)

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

Deployment is Terraform-driven: the Cloud Run service is declared in
`infrastructure/terraform/main.tf` under the `canvas-snapshot-generator`
block. Push a new container image, then apply:

```bash
docker build -t <region>-docker.pkg.dev/<project>/cloud-run-source-deploy/canvas-snapshot-generator:latest .
docker push <region>-docker.pkg.dev/<project>/cloud-run-source-deploy/canvas-snapshot-generator:latest
cd infrastructure/terraform && terraform apply
```

### Trigger manually

There is no direct HTTP trigger. The only invocation path is Pub/Sub push
on the `snapshot-requests` topic. To trigger a one-off snapshot from the
command line, publish a message to that topic (which Cloud Scheduler,
Discord `/snapshot`, and `write-pixels-worker` already do automatically):

```bash
gcloud pubsub topics publish snapshot-requests \
  --message='{"canvasId":"main-canvas"}'
```

## Environment Variables

- `GCP_PROJECT_ID` - GCP project ID (default: serverless-488811)
- `CANVAS_SNAPSHOTS_BUCKET` - Cloud Storage bucket name (default: serverless-488811-canvas-snapshots)

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
