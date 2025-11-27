/**
 * API Gateway Infrastructure - Module
 *
 * This module provisions a GCP API Gateway as the single public entry point
 * for the Cervelet serverless application. All traffic is routed to the cf-proxy
 * Cloud Run service, which handles Discord webhooks, web requests, and other traffic.
 *
 * Security features:
 * - HTTPS-only traffic (enforced by API Gateway default)
 * - Private Cloud Run backend (requires IAM-based invocation)
 * - Dedicated service account with least-privilege IAM permissions
 */

# ============================================================================
# Service Account for API Gateway Configuration
# ============================================================================

resource "google_service_account" "api_gateway_config" {
  account_id   = "sa-api-gateway-config"
  display_name = "API Gateway Config Service Account"
  description  = "Service account used by API Gateway to invoke the cf-proxy Cloud Run service"
  project      = var.project_id
}

# ============================================================================
# IAM Permission: Allow API Gateway to Invoke Cloud Run Service
# ============================================================================

resource "google_cloud_run_service_iam_member" "api_gateway_invoker" {
  project  = var.project_id
  location = var.region
  service  = var.proxy_cloud_run_service_name

  role   = "roles/run.invoker"
  member = "serviceAccount:${google_service_account.api_gateway_config.email}"

  depends_on = [google_service_account.api_gateway_config]
}

# ============================================================================
# API Gateway: API Definition
# ============================================================================

resource "google_api_gateway_api" "api" {
  provider = google-beta

  api_id       = var.api_gateway_id
  display_name = var.api_gateway_display_name
  project      = var.project_id

  labels = var.labels
}

# ============================================================================
# API Gateway: Configuration (OpenAPI Spec + Service Account)
# ============================================================================

resource "google_api_gateway_api_config" "api_config" {
  provider = google-beta

  api                   = google_api_gateway_api.api.api_id
  api_config_id_prefix  = "${var.api_gateway_id}-config-"
  display_name          = "API Config for ${var.api_gateway_display_name}"
  project               = var.project_id

  # Link the OpenAPI specification
  openapi_documents {
    document {
      path = "openapi.yaml"
      contents = base64encode(templatefile("${path.module}/openapi.yaml", {
        backend_url = var.proxy_cloud_run_service_url
      }))
    }
  }

  # Associate the service account for backend invocation
  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway_config.email
    }
  }

  labels = var.labels

  depends_on = [
    google_api_gateway_api.api,
    google_service_account.api_gateway_config,
    google_cloud_run_service_iam_member.api_gateway_invoker
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# API Gateway: Gateway Deployment (Public-Facing)
# ============================================================================

resource "google_api_gateway_gateway" "gateway" {
  provider = google-beta

  gateway_id   = "${var.api_gateway_id}-gateway"
  display_name = "Gateway for ${var.api_gateway_display_name}"
  project      = var.project_id
  region       = var.region

  api_config = google_api_gateway_api_config.api_config.id

  labels = var.labels

  depends_on = [google_api_gateway_api_config.api_config]
}
