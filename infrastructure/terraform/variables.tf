variable "project_id" {
  description = "The GCP project ID where resources will be deployed"
  type        = string
  default     = "serverless-488811"
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# ===========================================================================
# Firestore Variables
# ===========================================================================

variable "firestore_location" {
  description = "Location for Firestore database"
  type        = string
  default     = "europe-west1"
}

variable "firestore_concurrency_mode" {
  description = "Firestore concurrency mode: OPTIMISTIC or PESSIMISTIC"
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
  default     = ["*"]
}

# ===========================================================================
# Cloud Scheduler Variables
# ===========================================================================

variable "enable_snapshot_scheduler" {
  description = "Enable Cloud Scheduler for periodic canvas snapshots via Pub/Sub"
  type        = bool
  default     = false
}

variable "snapshot_schedule" {
  description = "Cron schedule for canvas snapshots"
  type        = string
  default     = "*/5 * * * *"
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

variable "monitoring_cloud_run_services" {
  description = "List of Cloud Run service names to monitor"
  type        = list(string)
  default = [
    "cf-proxy",
    "write-pixels-worker",
    "canvas-snapshot-generator",
    "discord-cmd-worker",
  ]
}

variable "monitoring_queue_depth_threshold" {
  description = "Threshold for Pub/Sub undelivered messages alert"
  type        = number
  default     = 1000
}

variable "monitoring_function_error_rate_threshold" {
  description = "Threshold for Cloud Run non-2xx error rate (errors per second)"
  type        = number
  default     = 5
}

variable "monitoring_function_execution_time_threshold_ms" {
  description = "Threshold for Cloud Run P99 latency in milliseconds"
  type        = number
  default     = 30000
}

variable "monitoring_api_error_rate_threshold" {
  description = "Threshold for API Gateway 4xx/5xx error rate (errors per second)"
  type        = number
  default     = 5
}

variable "monitoring_enable_api_gateway_alert" {
  description = "Enable API Gateway alert (set to true after gateway has traffic)"
  type        = bool
  default     = false
}
