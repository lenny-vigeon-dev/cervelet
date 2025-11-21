terraform {
  backend "gcs" {
    bucket = "serverless-tek89-terraform-state-bucket"
    prefix = "serverless/state"
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

# Firestore Database
module "firestore" {
  source = "./modules/firestore"

  project_id   = var.project_id
  project_name = "pixelhub"
  environment  = var.environment
  location_id  = var.firestore_location

  # Configuration
  concurrency_mode       = var.firestore_concurrency_mode
  enable_pitr            = var.firestore_enable_pitr
  deletion_protection    = var.environment != "dev"
  create_service_account = var.firestore_create_service_account
}

# API Gateway - Single public entry point for the application
module "api_gateway" {
  source = "./modules/api-gateway"

  project_id                   = var.project_id
  region                       = var.region
  proxy_cloud_run_service_name = var.proxy_cloud_run_service_name
  proxy_cloud_run_service_url  = var.proxy_cloud_run_service_url
  api_gateway_id               = var.api_gateway_id
  api_gateway_display_name     = var.api_gateway_display_name

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }
}

# Pub/Sub Topics - Asynchronous messaging for the application
module "pubsub" {
  source = "./modules/pubsub"

  project_id = var.project_id

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }
}

# Cloud Storage - Canvas snapshots and static assets
module "storage" {
  source = "./modules/storage"

  project_id   = var.project_id
  project_name = "pixelhub"
  region       = var.region
  environment  = var.environment

  enable_versioning        = var.storage_enable_versioning
  snapshot_retention_days  = var.storage_snapshot_retention_days
  cors_origins             = var.storage_cors_origins
  create_service_account   = var.storage_create_service_account

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "cervelet"
  }
}

# Cloud Scheduler - Periodic canvas snapshots
# NOTE: This requires the Cloud Function to be deployed first
# Deploy the Cloud Function, get its URL, then set enable_snapshot_scheduler=true
module "scheduler" {
  count  = var.enable_snapshot_scheduler ? 1 : 0
  source = "./modules/scheduler"

  region                = var.region
  cloud_function_url    = var.snapshot_function_url
  service_account_email = module.storage.service_account_email

  schedule          = var.snapshot_schedule
  schedule_interval = var.snapshot_schedule_interval
  canvas_id         = "main-canvas"
}
