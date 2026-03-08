variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run services"
  type        = string
}

variable "services" {
  description = "Map of Cloud Run services to deploy"
  type = map(object({
    image                 = string
    port                  = optional(number, 8080)
    service_account_email = string
    min_instances         = optional(number, 0)
    max_instances         = optional(number, 10)
    memory                = optional(string, "256Mi")
    cpu                   = optional(string, "1")
    timeout               = optional(string, "300s")
    concurrency           = optional(number, 80)
    ingress               = optional(string, "INGRESS_TRAFFIC_INTERNAL_ONLY")
    allow_unauthenticated = optional(bool, false)
    env_vars              = optional(map(string), {})
    secret_env_vars = optional(map(object({
      secret_name = string
      version     = optional(string, "latest")
    })), {})
  }))
}

variable "labels" {
  description = "Labels to apply to all Cloud Run services"
  type        = map(string)
  default     = {}
}
