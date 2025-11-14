# Cervelet Infrastructure

This directory contains Terraform infrastructure-as-code for the Cervelet serverless application on GCP.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
              ┌──────────────────────┐
              │   API Gateway        │  ← Single public entry point
              │  (HTTPS-only)        │
              └──────────┬───────────┘
                         │ IAM Auth
                         ▼
              ┌──────────────────────┐
              │   cf-proxy           │  ← Private Cloud Run
              │  (Cloud Run)         │     Request router
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌────────┐    ┌──────────┐    ┌──────────┐
    │Discord │    │Firestore │    │  Other   │
    │Handler │    │          │    │Services  │
    └────────┘    └──────────┘    └──────────┘
```

## Directory Structure

```
infrastructure/
├── main.tf                    # Root Terraform config (calls modules)
├── variables.tf               # Root-level variables
├── outputs.tf                 # Root-level outputs
├── terraform.tfvars.example   # Example variable values
├── .terraform.lock.hcl        # Provider version lock file
└── modules/                   # Reusable Terraform modules
    ├── api-gateway/           # API Gateway module
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── openapi.yaml       # API routing specification
    │   └── README.md
    ├── firestore/             # Firestore database module
    └── hello-world-cloud-function/  # Example Cloud Function
```

## Modules

### 1. API Gateway (`modules/api-gateway/`)
- **Purpose**: Single public HTTPS entry point for all traffic
- **Backend**: Routes to `cf-proxy` Cloud Run service
- **Security**: IAM-based authentication, private backend
- **Routing**: OpenAPI 3.0 spec with catch-all path forwarding

### 2. Firestore (`modules/firestore/`)
- **Purpose**: NoSQL database for application data
- **Features**: Point-in-Time Recovery, service account management

### 3. Hello World Cloud Function (`modules/hello-world-cloud-function/`)
- **Purpose**: Example serverless function

## Prerequisites

1. **GCP Project**: Active project with billing enabled
2. **Required APIs**:
   ```bash
   gcloud services enable apigateway.googleapis.com
   gcloud services enable servicemanagement.googleapis.com
   gcloud services enable servicecontrol.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable firestore.googleapis.com
   gcloud services enable cloudfunctions.googleapis.com
   ```
3. **Terraform**: Version >= 1.5
4. **GCP Authentication**:
   ```bash
   gcloud auth application-default login
   ```
5. **Backend State Bucket**: GCS bucket for Terraform state (already configured in `main.tf`)

## Quick Start

### 1. Configure Variables

```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:
- `project_id`: Your GCP project ID (default: `serverless-tek89`)
- `region`: Your deployment region (default: `europe-west1`)
- **`proxy_cloud_run_service_url`**: **REQUIRED** - Get the cf-proxy URL:
  ```bash
  gcloud run services describe cf-proxy \
    --region=europe-west1 \
    --format='value(status.url)'
  ```

### 2. Initialize Terraform

```bash
terraform init
```

This will:
- Download required providers (Google Cloud)
- Initialize the GCS backend for state storage
- Set up module dependencies

### 3. Preview Changes

```bash
terraform plan
```

Review the planned changes before applying.

### 4. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted to confirm.

### 5. Get Outputs

After deployment:

```bash
terraform output
```

Key outputs:
- **`api_gateway_url`**: Your public API Gateway URL
- **`firestore_database_name`**: Firestore database name
- **`hello_world_function_url`**: Test function URL

## Configuration Details

### API Gateway Setup

The API Gateway requires the cf-proxy Cloud Run service to exist. If you haven't deployed it yet:

1. **Deploy cf-proxy first**:
   ```bash
   cd ../backend
   # Deploy your Cloud Run service
   ```

2. **Get the service URL**:
   ```bash
   gcloud run services describe cf-proxy \
     --region=europe-west1 \
     --format='value(status.url)'
   ```

3. **Add to terraform.tfvars**:
   ```hcl
   proxy_cloud_run_service_url = "https://cf-proxy-xxxxx-ew.a.run.app"
   ```

### Variable Customization

Edit `terraform.tfvars` to customize:

```hcl
# Core settings
project_id = "your-project-id"
region     = "europe-west1"
environment = "prod"  # dev, staging, or prod

# API Gateway
proxy_cloud_run_service_name = "cf-proxy"
proxy_cloud_run_service_url  = "https://cf-proxy-xxxxx.run.app"
api_gateway_id = "cervelet-api-gateway"

# Firestore
firestore_location = "europe-west1"
firestore_concurrency_mode = "OPTIMISTIC"
firestore_enable_pitr = true

# Access control
invokers = [
  "user:your-email@example.com"
]
```

## State Management

Terraform state is stored remotely in Google Cloud Storage:

- **Bucket**: `serverless-tek89-terraform-state-bucket`
- **Prefix**: `serverless/state`
- **Configured in**: `main.tf` backend block

### Viewing State

```bash
# List state resources
terraform state list

# Show specific resource
terraform state show module.api_gateway.google_api_gateway_gateway.gateway
```

### State Recovery

If you need to recover state from GCS:

```bash
gsutil ls gs://serverless-tek89-terraform-state-bucket/serverless/state/
```

## Deployment Workflow

### Initial Deployment

```bash
terraform init
terraform plan
terraform apply
```

### Updating Infrastructure

```bash
# After modifying .tf files or variables
terraform plan    # Preview changes
terraform apply   # Apply changes
```

### Adding a New Module

1. Create module in `modules/your-module/`
2. Add module call in `main.tf`:
   ```hcl
   module "your_module" {
     source = "./modules/your-module"
     # ... variables
   }
   ```
3. Add outputs in `outputs.tf` if needed
4. Run `terraform init` to initialize the new module
5. Run `terraform plan` and `terraform apply`

## Troubleshooting

### Issue: "Backend initialization required"

**Solution**:
```bash
terraform init -reconfigure
```

### Issue: API Gateway deployment fails

**Cause**: cf-proxy service doesn't exist or URL is incorrect

**Solution**:
1. Verify cf-proxy exists:
   ```bash
   gcloud run services list --region=europe-west1
   ```
2. Update `proxy_cloud_run_service_url` in `terraform.tfvars`

### Issue: "Permission denied" on state bucket

**Cause**: Insufficient GCS permissions

**Solution**:
```bash
# Grant yourself storage admin on the bucket
gsutil iam ch user:YOUR-EMAIL@gmail.com:roles/storage.admin \
  gs://serverless-tek89-terraform-state-bucket
```

### Issue: OpenAPI spec validation errors

**Cause**: Invalid OpenAPI syntax in `modules/api-gateway/openapi.yaml`

**Solution**:
```bash
# Validate OpenAPI spec
npx @apidevtools/swagger-cli validate \
  modules/api-gateway/openapi.yaml
```

## Security Best Practices

✅ **State Encryption**: GCS bucket uses server-side encryption
✅ **Private Backends**: Cloud Run services are private (no public ingress)
✅ **IAM-Based Auth**: Service accounts with least-privilege permissions
✅ **HTTPS-Only**: API Gateway enforces HTTPS
✅ **Variable Validation**: Input validation on all variables
✅ **Secrets Management**: Never commit `terraform.tfvars` (gitignored)

## Cost Estimation

| Resource | Estimated Monthly Cost (light usage) |
|----------|--------------------------------------|
| API Gateway | Free (first 2M calls) |
| Cloud Run (cf-proxy) | ~$5-20 (depends on traffic) |
| Firestore | ~$1-10 (depends on reads/writes) |
| Cloud Functions | Free tier (2M invocations) |
| **Total** | **~$6-30/month** |

## Cleanup

To destroy all infrastructure:

```bash
terraform destroy
```

**⚠️ Warning**: This will delete:
- API Gateway
- Cloud Run services
- Firestore database (if deletion_protection is false)
- Service accounts

Make sure to backup any data before destroying!

## Additional Resources

- [Terraform GCP Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCP API Gateway Documentation](https://cloud.google.com/api-gateway/docs)
- [Terraform Module Best Practices](https://www.terraform.io/docs/language/modules/develop/index.html)
- [GCS Backend Configuration](https://www.terraform.io/docs/language/settings/backends/gcs.html)

## Support

For issues or questions:
- Check module-specific READMEs in `modules/*/README.md`
- Review Terraform plan output
- Check GCP Cloud Console for resource status
- Contact the DevOps team

---

**Last Updated**: 2025-11-14
**Terraform Version**: >= 1.5
**GCP Provider Version**: ~> 5.0
