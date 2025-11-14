variable "project_id" {
  description = "PixelHub"
  type        = string
  default     = "serverless-tek89"
}

variable "region" {
  description = "Region for the Cloud Function"
  type        = string
  default     = "europe-west1"
}

variable "invokers" {
  description = "List of users allowed to invoke the function"
  type        = list(string)
  default = [
    "user:lenny.vigeon@gmail.com",
    "user:arospars77@gmail.com",
    "user:lebib.yann@gmail.com",
    "user:jeanpierre.janopoulos@gmail.com",
    "user:dev.ethan.nguyen@gmail.com",
  ]
}

variable "tfstate_bucket" {
  description = "GCS bucket for Terraform state files"
  type        = string
  default     = "serverless-tek89-terraform-state-bucket"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "firestore_location" {
  description = "Location for Firestore database (e.g., 'europe-west1', 'nam5' for multi-region)"
  type        = string
  default     = "europe-west1"
}

variable "firestore_concurrency_mode" {
  description = "Firestore concurrency mode: OPTIMISTIC (lower latency) or PESSIMISTIC (stronger consistency)"
  type        = string
  default     = "OPTIMISTIC"
}

variable "firestore_enable_pitr" {
  description = "Enable Point-in-Time Recovery for Firestore"
  type        = bool
  default     = true
}

variable "firestore_create_service_account" {
  description = "Create a service account for Firestore access"
  type        = bool
  default     = true
}

# ===========================================================================
# API Gateway Variables
# ===========================================================================

variable "proxy_cloud_run_service_name" {
  description = "The name of the backend Cloud Run service that handles all requests"
  type        = string
  default     = "cf-proxy"
}

variable "proxy_cloud_run_service_url" {
  description = "The full HTTPS URL of the private Cloud Run service (e.g., https://cf-proxy-xxx.run.app)"
  type        = string
  # This should be set in terraform.tfvars
}

variable "api_gateway_id" {
  description = "The unique identifier for the API Gateway API resource"
  type        = string
  default     = "cervelet-api-gateway"
}

variable "api_gateway_display_name" {
  description = "Display name for the API Gateway"
  type        = string
  default     = "Cervelet API Gateway"
}
