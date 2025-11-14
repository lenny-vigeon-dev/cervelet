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

# Cloud SQL Database
module "cloud_sql" {
  source = "./modules/cloud-sql"

  project_id      = var.project_id
  project_name    = "pixelhub"
  environment     = var.environment
  region          = var.region
  database_name   = var.database_name
  database_user   = var.database_user
  database_password = var.database_password

  # Instance configuration
  tier               = var.db_tier
  database_version   = "POSTGRES_15"
  initial_disk_size  = 10
  max_disk_size      = 100
  max_connections    = "100"

  # Security
  deletion_protection = var.environment == "prod" ? true : false
  public_ip_enabled   = true

  # Allow connections from authorized IPs (add your IPs here)
  authorized_networks = var.authorized_networks
}

module "hello_world" {
  source      = "./modules/hello-world-cloud-function"
  source_dir  = "../applications/hello-world-cloud-function"
  project_id  = var.project_id
  region      = var.region
  name        = "hello-world"
  entry_point = "helloWorld"
  invokers    = var.invokers
}
