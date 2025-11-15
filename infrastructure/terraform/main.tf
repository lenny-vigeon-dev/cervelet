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
