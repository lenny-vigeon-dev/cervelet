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
  deletion_protection    = var.environment == "prod" ? true : false
  create_service_account = var.firestore_create_service_account
}
