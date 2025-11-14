variable "project_id" {
  description = "PixelHub"
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
  default = [
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

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "pixelhub"
}

variable "database_user" {
  description = "Database user name"
  type        = string
  default     = "pixelhub_user"
}

variable "database_password" {
  description = "Database user password (should be set via tfvars or environment variable)"
  type        = string
  sensitive   = true
}

variable "db_tier" {
  description = "Cloud SQL instance tier (db-f1-micro for dev, db-custom-2-7680 for prod)"
  type        = string
  default     = "db-f1-micro"
}

variable "authorized_networks" {
  description = "List of authorized networks for database access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}
