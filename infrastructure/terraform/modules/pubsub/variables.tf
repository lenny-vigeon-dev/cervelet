variable "project_id" {
  description = "The GCP project ID where Pub/Sub topics will be created"
  type        = string
}

variable "labels" {
  description = "Labels to apply to Pub/Sub topics"
  type        = map(string)
  default     = {}
}

# Push subscription endpoints (Cloud Run URLs)
# Set to "" to skip creating the subscription for that topic.

variable "write_pixels_worker_url" {
  description = "Cloud Run URL of the write-pixels-worker service"
  type        = string
  default     = ""
}

variable "discord_cmd_worker_url" {
  description = "Cloud Run URL of the discord-cmd-worker service"
  type        = string
  default     = ""
}

variable "snapshot_generator_url" {
  description = "Cloud Run URL of the canvas-snapshot-generator service"
  type        = string
  default     = ""
}

variable "write_pixels_sa_email" {
  description = "Service account email for write-pixels-worker push subscription"
  type        = string
  default     = ""
}

variable "discord_cmd_sa_email" {
  description = "Service account email for discord-cmd-worker push subscription"
  type        = string
  default     = ""
}

variable "snapshot_sa_email" {
  description = "Service account email for snapshot-generator push subscription"
  type        = string
  default     = ""
}
