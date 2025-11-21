variable "job_name_prefix" {
  description = "Prefix for the Cloud Scheduler job name"
  type        = string
  default     = "pixelhub"
}

variable "region" {
  description = "GCP region for the Cloud Scheduler job"
  type        = string
  default     = "europe-west1"
}

variable "schedule" {
  description = "Cron schedule for the job (e.g., '*/5 * * * *' for every 5 minutes)"
  type        = string
  default     = "*/5 * * * *"
}

variable "schedule_interval" {
  description = "Human-readable description of the schedule interval"
  type        = string
  default     = "5 minutes"
}

variable "time_zone" {
  description = "Time zone for the schedule"
  type        = string
  default     = "Europe/Paris"
}

variable "attempt_deadline" {
  description = "The deadline for job attempts (max time allowed for function execution)"
  type        = string
  default     = "540s"
}

variable "cloud_function_url" {
  description = "URL of the Cloud Function to trigger"
  type        = string
}

variable "service_account_email" {
  description = "Service account email for authentication"
  type        = string
}

variable "canvas_id" {
  description = "Canvas ID to snapshot"
  type        = string
  default     = "main-canvas"
}

variable "retry_count" {
  description = "Number of retry attempts for failed jobs"
  type        = number
  default     = 3
}

variable "max_retry_duration" {
  description = "Maximum duration for retries"
  type        = string
  default     = "600s"
}

variable "min_backoff_duration" {
  description = "Minimum backoff duration between retries"
  type        = string
  default     = "5s"
}

variable "max_backoff_duration" {
  description = "Maximum backoff duration between retries"
  type        = string
  default     = "60s"
}

variable "max_doublings" {
  description = "Maximum number of times to double the backoff between retries"
  type        = number
  default     = 5
}
