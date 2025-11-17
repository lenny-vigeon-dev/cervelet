# Deploying cf-proxy to Cloud Run

This guide explains how to deploy the `cf-proxy` NestJS application to Google Cloud Run using Cloud Build.

## Overview

The `cf-proxy` service is a NestJS backend that acts as a proxy between the API Gateway and internal services. It's deployed as a private Cloud Run service with internal-only ingress.

## Architecture

- **Service Name**: `cf-proxy`
- **Platform**: Cloud Run (Managed)
- **Region**: `europe-west1`
- **Ingress**: Internal only (not publicly accessible)
- **Service Account**: `proxy-svc@serverless-tek89.iam.gserviceaccount.com`
- **Container Registry**: Artifact Registry (`europe-west1-docker.pkg.dev`)

## Prerequisites

1. **Google Cloud SDK** installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project serverless-tek89
   ```

2. **Required APIs enabled**:
   - Cloud Build API (`cloudbuild.googleapis.com`)
   - Artifact Registry API (`artifactregistry.googleapis.com`)
   - Cloud Run API (`run.googleapis.com`)

3. **IAM Permissions**:
   - Compute Engine service account needs:
     - `roles/artifactregistry.writer` (on repository)
     - `roles/run.admin`
     - `roles/iam.serviceAccountUser`
     - `roles/storage.objectViewer`
     - `roles/logging.logWriter`

## Deployment Process

### Using the Deploy Script (Recommended)

The simplest way to deploy is using the provided script:

```bash
cd backend
./deploy-cloud-build.sh
```

This script will:
1. Install dependencies with pnpm
2. Build the NestJS application
3. Submit to Cloud Build for:
   - Building Docker image (AMD64 architecture)
   - Pushing to Artifact Registry
   - Deploying to Cloud Run

### Manual Deployment

If you prefer to deploy manually:

```bash
cd backend

# 1. Build the application locally
pnpm install
pnpm run build

# 2. Submit to Cloud Build
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=serverless-tek89 \
  --region=europe-west1
```

## Cloud Build Configuration

The deployment uses [`cloudbuild.yaml`](../backend/cloudbuild.yaml) which defines three steps:

1. **Build**: Builds the Docker image using multi-stage build
2. **Push**: Pushes image to Artifact Registry
3. **Deploy**: Deploys to Cloud Run with configuration

### Why Cloud Build?

Cloud Build is used instead of local Docker builds because:
- **Architecture Compatibility**: Builds natively on AMD64 (Cloud Run requirement)
- **Consistency**: Same build environment for all developers
- **CI/CD Ready**: Can be triggered automatically from git pushes
- **No Local Docker Issues**: Avoids ARM64/AMD64 cross-compilation problems on Mac M1/M2

## Configuration Details

### Cloud Run Service Configuration

- **Memory**: 2Gi
- **CPU**: 2 cores
- **Min Instances**: 0 (scales to zero)
- **Max Instances**: 10
- **Timeout**: 300s (5 minutes)
- **Port**: 8080
- **CPU Throttling**: Disabled
- **Authentication**: Required (not publicly accessible)

### Environment Variables

- `NODE_ENV=production`
- `GCP_PROJECT=serverless-tek89`
- `PORT=8080` (set by Cloud Run)

### Service Account

The service runs as `proxy-svc@serverless-tek89.iam.gserviceaccount.com` which has:
- Firestore access (`roles/datastore.user`)
- Cloud Run invoker permissions for downstream services

## Troubleshooting

### Build Failures

**Issue**: Architecture mismatch errors (`exec format error`)
- **Cause**: Building ARM64 images locally on Mac M1/M2
- **Solution**: Always use `./deploy-cloud-build.sh` which builds on AMD64

**Issue**: Permission denied on Artifact Registry
- **Cause**: Cloud Build service account lacks permissions
- **Solution**: Grant permissions:
  ```bash
  gcloud artifacts repositories add-iam-policy-binding cloud-run-source-deploy \
    --location=europe-west1 \
    --member="serviceAccount:343984406897-compute@developer.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"
  ```

### Deployment Failures

**Issue**: Container failed to start (timeout)
- **Cause**: Application not listening on 0.0.0.0:8080
- **Solution**: Check [`src/main.ts`](../backend/src/main.ts) listens on `0.0.0.0`

**Issue**: Firestore initialization blocking startup
- **Cause**: Synchronous Firestore initialization
- **Solution**: Firestore is initialized asynchronously in background (see [`src/firestore/firestore.service.ts`](../backend/src/firestore/firestore.service.ts))

### Checking Logs

View deployment logs:
```bash
# Latest build
gcloud builds list --limit=1 --project=serverless-tek89

# Build logs
gcloud builds log BUILD_ID --project=serverless-tek89 --region=europe-west1

# Cloud Run logs
gcloud run services logs read cf-proxy \
  --region=europe-west1 \
  --project=serverless-tek89
```

## Getting the Service URL

After successful deployment:

```bash
gcloud run services describe cf-proxy \
  --region=europe-west1 \
  --format='value(status.url)'
```

Example output:
```
https://cf-proxy-d7nhytzhtq-ew.a.run.app
```

**Note**: This URL is only accessible from within the GCP VPC due to `--ingress=internal` setting.

## Next Steps

After deploying `cf-proxy`, you need to:

1. **Update Terraform variables** with the service URL:
   ```hcl
   # infrastructure/terraform/terraform.tfvars
   proxy_cloud_run_service_url = "https://cf-proxy-d7nhytzhtq-ew.a.run.app"
   ```

2. **Deploy API Gateway** to route public traffic to cf-proxy:
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform apply
   ```

## Files Reference

- [`backend/cloudbuild.yaml`](../backend/cloudbuild.yaml) - Cloud Build configuration
- [`backend/deploy-cloud-build.sh`](../backend/deploy-cloud-build.sh) - Deployment script
- [`backend/Dockerfile`](../backend/Dockerfile) - Multi-stage Docker build
- [`backend/src/main.ts`](../backend/src/main.ts) - Application entry point
- [`backend/src/firestore/firestore.service.ts`](../backend/src/firestore/firestore.service.ts) - Async Firestore initialization

## Security Considerations

- Service is **internal only** - not publicly accessible
- Requires authentication for all requests
- Runs with minimal service account permissions
- Environment variables don't contain secrets (uses Application Default Credentials)
- No health check endpoint exposed (Cloud Run has built-in health checks)

## Cost Optimization

- **Scales to zero**: No cost when idle
- **Efficient cold starts**: Multi-stage Docker build keeps image size small
- **Resource limits**: Capped at 10 instances max
- **Regional deployment**: Single region to minimize egress costs
