terraform {
  # NOTE: The backend bucket is hardcoded because Terraform's backend block
  # does not support variables or interpolation. To deploy to a different
  # project, override via: terraform init -backend-config="bucket=<bucket>"
  backend "gcs" {
    bucket = "serverless-488811-terraform-state-bucket"
    prefix = "serverless/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ===========================================================================
# GCP API Enablement
# ===========================================================================

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "apigateway.googleapis.com",
    "servicemanagement.googleapis.com",
    "servicecontrol.googleapis.com",
    "monitoring.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ===========================================================================
# Firestore Database
# ===========================================================================

module "firestore" {
  source = "./modules/firestore"

  project_id   = var.project_id
  project_name = "pixelhub"
  environment  = var.environment
  location_id  = var.firestore_location

  concurrency_mode       = var.firestore_concurrency_mode
  enable_pitr            = var.firestore_enable_pitr
  deletion_protection    = var.environment != "dev"
  create_service_account = var.firestore_create_service_account
}

# ===========================================================================
# Cloud Run Services
# ===========================================================================

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id = var.project_id
  region     = var.region

  services = {
    cf-proxy = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/cf-proxy:latest"
      service_account_email = google_service_account.proxy.email
      max_instances         = 10
      memory                = "512Mi"
      # API Gateway traffic is not considered internal/LB by Cloud Run.
      # Access is restricted by IAM (roles/run.invoker on the API Gateway SA).
      ingress = "INGRESS_TRAFFIC_ALL"
      env_vars = {
        GCP_PROJECT_ID = var.project_id
      }
      secret_env_vars = {
        DISCORD_APP_ID     = { secret_name = "DISCORD_APP_ID" }
        DISCORD_PUBLIC_KEY = { secret_name = "DISCORD_PUBLIC_KEY" }
        DISCORD_BOT_TOKEN  = { secret_name = "DISCORD_BOT_TOKEN" }
      }
    }

    write-pixels-worker = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/write-pixels-worker:latest"
      service_account_email = google_service_account.write_pixels.email
      max_instances         = 20
      memory                = "512Mi"
      ingress               = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
      env_vars = {
        GCP_PROJECT_ID         = var.project_id
        SNAPSHOT_TRIGGER_TOPIC = "snapshot-requests"
      }
    }

    canvas-snapshot-generator = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/canvas-snapshot-generator:latest"
      service_account_email = google_service_account.snap.email
      max_instances         = 5
      memory                = "1Gi"
      timeout               = "540s"
      ingress               = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
      env_vars = {
        GCP_PROJECT_ID = var.project_id
      }
    }

    discord-cmd-worker = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/discord-cmd-worker:latest"
      service_account_email = google_service_account.discord_cmd.email
      max_instances         = 10
      memory                = "512Mi"
      ingress               = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
      env_vars = {
        GCP_PROJECT_ID = var.project_id
      }
      secret_env_vars = {
        DISCORD_BOT_TOKEN = { secret_name = "DISCORD_BOT_TOKEN" }
      }
    }

  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }

  depends_on = [
    google_project_service.apis,
    module.secrets,
  ]
}

# ===========================================================================
# Frontend
# ===========================================================================

module "cloud_run_frontend" {
  source = "./modules/cloud-run"

  project_id = var.project_id
  region     = var.region

  services = {
    pixelhub-frontend = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/pixelhub-frontend:latest"
      service_account_email = google_service_account.proxy.email
      max_instances         = 10
      memory                = "512Mi"
      ingress               = "INGRESS_TRAFFIC_ALL"
      allow_unauthenticated = true
      env_vars = {
        NODE_ENV = "production"
      }
      secret_env_vars = {
        DISCORD_CLIENT_SECRET = { secret_name = "DISCORD_CLIENT_SECRET" }
      }
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }

  depends_on = [
    google_project_service.apis,
    module.cloud_run,
    module.secrets,
  ]
}

# ===========================================================================
# API Gateway - Single public entry point
# ===========================================================================

module "api_gateway" {
  source = "./modules/api-gateway"

  project_id                   = var.project_id
  region                       = var.region
  proxy_cloud_run_service_name = "cf-proxy"
  proxy_cloud_run_service_url  = module.cloud_run.service_urls["cf-proxy"]
  api_gateway_id               = var.api_gateway_id
  api_gateway_display_name     = var.api_gateway_display_name

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }

  depends_on = [module.cloud_run]
}

# ===========================================================================
# Pub/Sub Topics & Push Subscriptions
# ===========================================================================

module "pubsub" {
  source = "./modules/pubsub"

  project_id = var.project_id

  # Push subscription endpoints (from Cloud Run module outputs)
  write_pixels_worker_url = module.cloud_run.service_urls["write-pixels-worker"]
  discord_cmd_worker_url  = module.cloud_run.service_urls["discord-cmd-worker"]
  snapshot_generator_url  = module.cloud_run.service_urls["canvas-snapshot-generator"]

  # Service accounts for OIDC push authentication
  write_pixels_sa_email = google_service_account.write_pixels.email
  discord_cmd_sa_email  = google_service_account.discord_cmd.email
  snapshot_sa_email     = google_service_account.snap.email

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }

  depends_on = [module.cloud_run]
}

# ===========================================================================
# Secret Manager
# ===========================================================================

module "secrets" {
  source = "./modules/secrets"

  project_id = var.project_id

  secrets = {
    DISCORD_APP_ID = {
      accessors = [
        "serviceAccount:${google_service_account.proxy.email}",
      ]
    }
    DISCORD_PUBLIC_KEY = {
      accessors = [
        "serviceAccount:${google_service_account.proxy.email}",
      ]
    }
    DISCORD_BOT_TOKEN = {
      accessors = [
        "serviceAccount:${google_service_account.proxy.email}",
        "serviceAccount:${google_service_account.discord_cmd.email}",
      ]
    }
    DISCORD_CLIENT_SECRET = {
      accessors = [
        "serviceAccount:${google_service_account.proxy.email}",
      ]
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }

  depends_on = [google_project_service.apis]
}

# ===========================================================================
# Cloud Storage - Canvas snapshots
# ===========================================================================

module "storage" {
  source = "./modules/storage"

  project_id   = var.project_id
  project_name = "pixelhub"
  region       = var.region
  environment  = var.environment

  enable_versioning       = var.storage_enable_versioning
  snapshot_retention_days = var.storage_snapshot_retention_days
  cors_origins            = var.storage_cors_origins
  create_service_account  = false # Using snap-svc from service_accounts.tf

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }
}

# ===========================================================================
# Cloud Scheduler - Periodic canvas snapshots via Pub/Sub
# ===========================================================================

module "scheduler" {
  count  = var.enable_snapshot_scheduler ? 1 : 0
  source = "./modules/scheduler"

  project_id          = var.project_id
  region              = var.region
  snapshot_topic_id   = module.pubsub.snapshot_requests_topic_id
  snapshot_topic_name = module.pubsub.snapshot_requests_topic_name

  schedule          = var.snapshot_schedule
  schedule_interval = var.snapshot_schedule_interval
  canvas_id         = "main-canvas"
}

# ===========================================================================
# Monitoring and Alerting
# ===========================================================================

module "monitoring" {
  source = "./modules/monitoring"

  project_id            = var.project_id
  notification_channels = var.monitoring_notification_channels

  pubsub_subscriptions = module.pubsub.all_subscription_names

  cloud_run_services = var.monitoring_cloud_run_services

  api_gateway_name = var.api_gateway_id

  queue_depth_threshold                = var.monitoring_queue_depth_threshold
  function_error_rate_threshold        = var.monitoring_function_error_rate_threshold
  function_execution_time_threshold_ms = var.monitoring_function_execution_time_threshold_ms
  api_error_rate_threshold             = var.monitoring_api_error_rate_threshold
  enable_api_gateway_alert             = var.monitoring_enable_api_gateway_alert
}
