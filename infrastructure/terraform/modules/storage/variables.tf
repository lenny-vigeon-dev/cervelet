variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "region" {
  description = "GCP region for the storage bucket"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "enable_versioning" {
  description = "Enable object versioning for the bucket"
  type        = bool
  default     = true
}

variable "snapshot_retention_days" {
  description = "Number of days to retain historical snapshots"
  type        = number
  default     = 30
}

variable "cors_origins" {
  description = "Allowed CORS origins for the bucket"
  type        = list(string)
  default     = ["*"]
}

variable "labels" {
  description = "Labels to apply to the storage bucket"
  type        = map(string)
  default     = {}
}

variable "create_service_account" {
  description = "Whether to create a service account for snapshot generation"
  type        = bool
  default     = true
}

variable "enable_notifications" {
  description = "Enable Cloud Storage notifications"
  type        = bool
  default     = false
}

variable "notification_topic" {
  description = "Pub/Sub topic for storage notifications"
  type        = string
  default     = ""
}
