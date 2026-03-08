variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "secrets" {
  description = "Map of secret names to create in Secret Manager (values are managed outside Terraform)"
  type = map(object({
    description = optional(string, "")
    accessors   = list(string) # list of IAM members (e.g. serviceAccount:xxx@...)
  }))
}

variable "labels" {
  description = "Labels to apply to secrets"
  type        = map(string)
  default     = {}
}
