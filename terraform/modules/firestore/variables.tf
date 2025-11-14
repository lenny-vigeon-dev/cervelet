/**
 * Firestore Module Variables
 */

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "project_name" {
  description = "The project name (used for resource naming)"
  type        = string
}

variable "location_id" {
  description = "The location for the Firestore database (e.g., 'europe-west1', 'us-central1', 'nam5' for multi-region)"
  type        = string
  default     = "europe-west1"
}

variable "concurrency_mode" {
  description = "Concurrency mode: OPTIMISTIC (lower latency) or PESSIMISTIC (stronger consistency)"
  type        = string
  default     = "OPTIMISTIC"

  validation {
    condition     = contains(["OPTIMISTIC", "PESSIMISTIC"], var.concurrency_mode)
    error_message = "Concurrency mode must be either OPTIMISTIC or PESSIMISTIC"
  }
}

variable "enable_pitr" {
  description = "Enable Point-in-Time Recovery for Firestore"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection for the Firestore database"
  type        = bool
  default     = true
}

variable "create_service_account" {
  description = "Create a service account for Firestore access"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}
