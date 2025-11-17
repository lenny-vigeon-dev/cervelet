# Deploy cf-proxy to Cloud Run

This guide walks you through deploying your NestJS application as the `cf-proxy` Cloud Run service.

## Prerequisites

1. **GCP Project**: `serverless-tek89` (already configured)
2. **gcloud CLI**: Installed and authenticated
3. **pnpm**: Node package manager
4. **Docker** (optional): Only needed for local testing

## Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
cd backend
./deploy-cloud-run.sh
```

This script will:
1. Build your NestJS application
2. Create a Docker image using Cloud Build
3. Deploy to Cloud Run as `cf-proxy`
4. Output the service URL

### Option 2: Manual Deployment

```bash
cd backend

# 1. Build the application
pnpm install
pnpm run build

# 2. Build and push Docker image
gcloud builds submit \
  --tag gcr.io/serverless-tek89/cf-proxy \
  --timeout=10m

# 3. Deploy to Cloud Run
gcloud run deploy cf-proxy \
  --image gcr.io/serverless-tek89/cf-proxy \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --ingress internal \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 30s \
  --set-env-vars "NODE_ENV=production"

# 4. Get the service URL
gcloud run services describe cf-proxy \
  --region europe-west1 \
  --format='value(status.url)'
```

## Configuration Details

### Cloud Run Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Service Name** | `cf-proxy` | Name of the Cloud Run service |
| **Region** | `europe-west1` | Deployment region |
| **Port** | `8080` | Container port (Cloud Run default) |
| **Memory** | `512Mi` | Memory allocation |
| **CPU** | `1` | CPU allocation |
| **Min Instances** | `0` | Scale to zero when idle |
| **Max Instances** | `10` | Maximum concurrent instances |
| **Timeout** | `30s` | Request timeout |
| **Ingress** | `internal` | Private service (no public access) |

### Why Private (Internal Ingress)?

The `cf-proxy` service is configured as **private** (`--ingress internal`) because:
1. It should ONLY be accessible through the API Gateway
2. The API Gateway uses IAM authentication to invoke it
3. No direct public access is allowed
4. Better security posture

## After Deployment

### 1. Get the Service URL

```bash
gcloud run services describe cf-proxy \
  --region europe-west1 \
  --format='value(status.url)'
```

Example output:
```
https://cf-proxy-xxxxx-ew.a.run.app
```

### 2. Update Terraform Variables

Edit `infrastructure/terraform/terraform.tfvars`:

```hcl
proxy_cloud_run_service_url = "https://cf-proxy-xxxxx-ew.a.run.app"  # Use actual URL
```

### 3. Deploy API Gateway

```bash
cd ../infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## Testing the Deployment

### Health Check (Internal Only)

Since the service is private, you can't access it directly from your browser. Test it using:

```bash
# Using gcloud to invoke with authentication
gcloud run services proxy cf-proxy \
  --region europe-west1 \
  --port 8080 &

# Then in another terminal
curl http://localhost:8080/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-11-14T..."}
```

### After API Gateway Deployment

Once the API Gateway is deployed, test through it:

```bash
# Get API Gateway URL
cd ../infrastructure/terraform
terraform output api_gateway_url

# Test health endpoint
curl https://YOUR-GATEWAY-URL/health
```

## Troubleshooting

### Issue: "Permission denied" during deployment

**Solution**:
```bash
# Authenticate with gcloud
gcloud auth login

# Set project
gcloud config set project serverless-tek89
```

### Issue: Build fails with "pnpm: command not found"

**Solution**:
```bash
npm install -g pnpm
```

### Issue: Service deployment succeeds but health check fails

**Cause**: Application not starting on port 8080

**Solution**: Ensure `src/main.ts` uses `process.env.PORT`:
```typescript
await app.listen(process.env.PORT ?? 8080);
```

### Issue: "Service is unhealthy"

**Solution**: Check logs:
```bash
gcloud run services logs read cf-proxy --region europe-west1 --limit 50
```

### Issue: Need to redeploy after code changes

```bash
# Quick redeploy
cd backend
./deploy-cloud-run.sh
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Build                          │
│  1. Builds Docker image from Dockerfile                 │
│  2. Pushes to Container Registry (gcr.io)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Container Registry (gcr.io)                │
│  Stores: gcr.io/serverless-tek89/cf-proxy:latest        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Cloud Run                             │
│  Service: cf-proxy                                      │
│  Ingress: internal (private)                            │
│  Authentication: Required (IAM)                         │
└─────────────────────────────────────────────────────────┘
                     ▲
                     │ IAM-authenticated requests
                     │
┌─────────────────────────────────────────────────────────┐
│                  API Gateway                            │
│  Public HTTPS entry point                               │
│  Routes all traffic to cf-proxy                         │
└─────────────────────────────────────────────────────────┘
```

## Environment Variables

The deployment automatically sets:
- `NODE_ENV=production`
- `PORT=8080`

To add more environment variables:

```bash
gcloud run services update cf-proxy \
  --region europe-west1 \
  --set-env-vars "VAR_NAME=value,ANOTHER_VAR=value"
```

Or use a `.env.yaml` file:

```yaml
# env.yaml
NODE_ENV: production
PORT: "8080"
DATABASE_URL: "your-db-url"
```

```bash
gcloud run services update cf-proxy \
  --region europe-west1 \
  --env-vars-file env.yaml
```

## Monitoring

### View Logs

```bash
# Recent logs
gcloud run services logs read cf-proxy \
  --region europe-west1 \
  --limit 50

# Follow logs in real-time
gcloud run services logs tail cf-proxy \
  --region europe-west1
```

### View Metrics

```bash
# Open Cloud Console
gcloud run services describe cf-proxy \
  --region europe-west1 \
  --format='value(status.url)' | \
  xargs -I {} echo "https://console.cloud.google.com/run/detail/europe-west1/cf-proxy"
```

## Cost Estimation

Cloud Run charges based on:
- CPU usage (while handling requests)
- Memory usage (while handling requests)
- Network egress

**Estimated cost** (light usage):
- ~$0.10 - $5.00 per month with scale-to-zero
- Free tier: 2M requests, 360,000 GB-seconds per month

## Next Steps

After successful deployment:

1. ✅ cf-proxy is deployed
2. ⏭️ Update `terraform.tfvars` with the service URL
3. ⏭️ Deploy API Gateway with Terraform
4. ⏭️ Update Discord webhook URL to point to API Gateway
5. ⏭️ Test end-to-end flow

---

**Questions?** Check the troubleshooting section or GCP Cloud Run docs.
