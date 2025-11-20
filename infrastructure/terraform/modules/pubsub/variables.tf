variable "project_id" {
  description = "The GCP project ID where Pub/Sub topics will be created"
  type        = string
}

variable "labels" {
  description = "Labels to apply to Pub/Sub topics"
  type        = map(string)
  default     = {}
}
