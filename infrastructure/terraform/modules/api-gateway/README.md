# API Gateway Terraform Module

This module provisions a GCP API Gateway as the single public entry point for the Cervelet serverless application.

## Architecture

```
Internet → API Gateway (HTTPS) → cf-proxy Cloud Run (private) → Backend Services
```

## Features

- **Single Entry Point**: All traffic flows through the API Gateway
- **HTTPS-Only**: Enforced by default
- **Private Backend**: Cloud Run service is private (internal traffic only)
- **IAM-Based Security**: Dedicated service account with `roles/run.invoker`
- **Catch-All Routing**: All paths route to the cf-proxy service

## Usage

This module is called from the root `main.tf`:

```hcl
module "api_gateway" {
  source = "./terraform/modules/api-gateway"

  project_id                   = var.project_id
  region                       = var.region
  proxy_cloud_run_service_name = var.proxy_cloud_run_service_name
  proxy_cloud_run_service_url  = var.proxy_cloud_run_service_url
  api_gateway_id               = var.api_gateway_id
  api_gateway_display_name     = var.api_gateway_display_name

  labels = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Inputs

| Name | Description | Type | Required |
|------|-------------|------|----------|
| `project_id` | GCP Project ID | `string` | Yes |
| `region` | GCP region for deployment | `string` | Yes |
| `proxy_cloud_run_service_name` | Name of the backend Cloud Run service | `string` | Yes |
| `proxy_cloud_run_service_url` | Full HTTPS URL of the Cloud Run service | `string` | Yes |
| `api_gateway_id` | Unique identifier for the API Gateway | `string` | No (default: cervelet-api-gateway) |
| `api_gateway_display_name` | Display name for the API Gateway | `string` | No (default: Cervelet API Gateway) |
| `labels` | Labels to apply to resources | `map(string)` | No |

## Outputs

| Name | Description |
|------|-------------|
| `api_gateway_url` | Public URL of the deployed API Gateway |
| `api_gateway_id` | The ID of the API Gateway |
| `api_config_id` | The ID of the API Gateway configuration |
| `service_account_email` | Email of the service account used by API Gateway |
| `backend_cloud_run_service` | Name of the backend Cloud Run service |

## Routing

The module uses an OpenAPI specification ([openapi.yaml](openapi.yaml)) that defines:

- **`/discord/webhook`**: Discord webhook endpoint
- **`/discord/{proxy+}`**: All Discord-related paths
- **`/{proxy+}`**: Catch-all for all other traffic

All routes forward to the cf-proxy Cloud Run service with a 30-second deadline.

## Security

- Service account created: `sa-api-gateway-config@PROJECT_ID.iam.gserviceaccount.com`
- IAM role granted: `roles/run.invoker` on the cf-proxy service
- HTTPS enforced by API Gateway
- Backend Cloud Run service must be private (no public ingress)
