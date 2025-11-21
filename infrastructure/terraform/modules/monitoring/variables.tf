variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "notification_channels" {
  description = "List of notification channel IDs for alerts"
  type        = list(string)
  default     = []
}

variable "pubsub_topics" {
  description = "List of Pub/Sub topic names to monitor"
  type        = list(string)
  default     = []
}

variable "pubsub_subscriptions" {
  description = "List of Pub/Sub subscription names to monitor"
  type        = list(string)
  default     = []
}

variable "cloud_functions" {
  description = "List of Cloud Function names to monitor"
  type        = list(string)
  default     = []
}

variable "api_gateway_name" {
  description = "API Gateway name to monitor"
  type        = string
  default     = ""
}

variable "queue_depth_threshold" {
  description = "Threshold for Pub/Sub undelivered messages alert"
  type        = number
  default     = 1000
}

variable "function_error_rate_threshold" {
  description = "Threshold for function error rate (percentage)"
  type        = number
  default     = 5
}

variable "function_execution_time_threshold_ms" {
  description = "Threshold for function execution time in milliseconds"
  type        = number
  default     = 30000
}

variable "api_error_rate_threshold" {
  description = "Threshold for API Gateway error rate (percentage)"
  type        = number
  default     = 5
}

variable "enable_api_gateway_alert" {
  description = "Enable API Gateway alert (requires gateway to have received traffic first)"
  type        = bool
  default     = false
}
