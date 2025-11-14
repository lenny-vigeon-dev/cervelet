/**
 * Variables for API Gateway Infrastructure
 *
 * This file defines the input variables for provisioning the GCP API Gateway
 * that serves as the single public entry point for the serverless application.
 */

variable "project_id" {
  description = "The GCP Project ID where resources will be created"
  type        = string
  validation {
    condition     = length(var.project_id) > 0
    error_message = "The project_id must not be empty."
  }
}

variable "region" {
  description = "The GCP region for API Gateway deployment (e.g., europe-west1)"
  type        = string
  default     = "europe-west1"
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]$", var.region))
    error_message = "The region must be a valid GCP region format (e.g., europe-west1)."
  }
}

variable "proxy_cloud_run_service_name" {
  description = "The name of the backend Cloud Run service that handles all requests"
  type        = string
  default     = "cf-proxy"
  validation {
    condition     = length(var.proxy_cloud_run_service_name) > 0
    error_message = "The proxy_cloud_run_service_name must not be empty."
  }
}

variable "proxy_cloud_run_service_url" {
  description = "The full HTTPS URL of the private Cloud Run service (e.g., https://cf-proxy-xxx.run.app)"
  type        = string
  validation {
    condition     = can(regex("^https://.*\\.run\\.app$", var.proxy_cloud_run_service_url))
    error_message = "The proxy_cloud_run_service_url must be a valid Cloud Run HTTPS URL ending with .run.app."
  }
}

variable "api_gateway_id" {
  description = "The unique identifier for the API Gateway API resource"
  type        = string
  default     = "cervelet-api-gateway"
  validation {
    condition     = can(regex("^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$", var.api_gateway_id))
    error_message = "The api_gateway_id must start with a letter, contain only lowercase letters, numbers, and hyphens, and be 1-63 characters."
  }
}

variable "api_gateway_display_name" {
  description = "Display name for the API Gateway"
  type        = string
  default     = "Cervelet API Gateway"
}

variable "labels" {
  description = "Labels to apply to all resources for organization and cost tracking"
  type        = map(string)
  default = {
    environment = "production"
    managed_by  = "terraform"
    application = "cervelet"
  }
}
