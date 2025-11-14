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
