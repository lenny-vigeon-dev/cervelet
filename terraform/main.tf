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

module "hello_world" {
  source       = "./modules/hello-world-cloud-function"
  source_dir   = "../applications/hello-world-cloud-function"
  project_id   = var.project_id
  region       = var.region
  name         = "hello-world"
  entry_point  = "helloWorld"
  invokers     = var.invokers
}
