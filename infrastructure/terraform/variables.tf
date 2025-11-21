variable "project_id" {
  description = "The GCP project ID where resources will be deployed"
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

# ===========================================================================
# Cloud Storage Variables
# ===========================================================================

variable "storage_enable_versioning" {
  description = "Enable object versioning for canvas snapshots bucket"
  type        = bool
  default     = true
}

variable "storage_snapshot_retention_days" {
  description = "Number of days to retain historical canvas snapshots"
  type        = number
  default     = 30
}

variable "storage_cors_origins" {
  description = "Allowed CORS origins for the storage bucket"
  type        = list(string)
  default     = ["*"] # Restrict this in production
}

variable "storage_create_service_account" {
  description = "Create a service account for snapshot generation"
  type        = bool
  default     = true
}

# ===========================================================================
# Cloud Scheduler Variables
# ===========================================================================

variable "enable_snapshot_scheduler" {
  description = "Enable Cloud Scheduler for periodic canvas snapshots"
  type        = bool
  default     = false # Disabled by default until Cloud Function is deployed
}

variable "snapshot_function_url" {
  description = "URL of the canvas snapshot generator Cloud Function"
  type        = string
  default     = "" # Must be set after deploying the Cloud Function
}

variable "snapshot_schedule" {
  description = "Cron schedule for canvas snapshots"
  type        = string
  default     = "*/5 * * * *" # Every 5 minutes
}

variable "snapshot_schedule_interval" {
  description = "Human-readable description of snapshot schedule"
  type        = string
  default     = "5 minutes"
}

# ===========================================================================
# Monitoring Variables
# ===========================================================================

variable "monitoring_notification_channels" {
  description = "List of notification channel IDs for alerting"
  type        = list(string)
  default     = []
}

variable "monitoring_cloud_functions" {
  description = "List of Cloud Function names to monitor"
  type        = list(string)
  default     = ["discord-acknowledge", "canvas-snapshot-generator"]
}

variable "monitoring_queue_depth_threshold" {
  description = "Threshold for Pub/Sub undelivered messages alert"
  type        = number
  default     = 1000
}

variable "monitoring_function_error_rate_threshold" {
  description = "Threshold for function error rate (percentage)"
  type        = number
  default     = 5
}

variable "monitoring_function_execution_time_threshold_ms" {
  description = "Threshold for function execution time in milliseconds"
  type        = number
  default     = 30000
}

variable "monitoring_api_error_rate_threshold" {
  description = "Threshold for API Gateway error rate (percentage)"
  type        = number
  default     = 5
}

variable "monitoring_enable_api_gateway_alert" {
  description = "Enable API Gateway alert (set to true after gateway has traffic)"
  type        = bool
  default     = false
}
