variable "project_id" {
  description = "Your GCP project ID"
  type        = string
  default     = "serverless-tek89"
}

variable "region" {
  description = "Region for the Cloud Function"
  type        = string
  default     = "europe-west1"
}

variable "invokers" {
  description = "List of users allowed to invoke the function"
  type        = list(string)
  default     = [
    "user:lenny.vigeon@gmail.com",
    "user:arospars77@gmail.com",
    "user:lebib.yann@gmail.com",
    "user:jeanpierre.janopoulos@gmail.com",
    "user:dev.ethan.nguyen@gmail.com",
  ]
}

variable "tfstate_bucket" {
  description = "GCS bucket for Terraform state files"
  type        = string
  default     = "serverless-tek89-terraform-state-bucket"
}