variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "pixelhub"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "tier" {
  description = "Machine tier (db-f1-micro, db-g1-small, db-custom-2-7680, etc)"
  type        = string
  default     = "db-f1-micro"
}

variable "initial_disk_size" {
  description = "Initial disk size in GB"
  type        = number
  default     = 10
}

variable "max_disk_size" {
  description = "Maximum disk size in GB (0 = no limit)"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "pixelhub"
}

variable "database_user" {
  description = "Database user name"
  type        = string
  default     = "pixelhub_user"
}

variable "database_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
}

variable "max_connections" {
  description = "Maximum number of database connections"
  type        = string
  default     = "100"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "public_ip_enabled" {
  description = "Enable public IP for the database"
  type        = bool
  default     = true
}

variable "vpc_network" {
  description = "VPC network for private IP (optional)"
  type        = string
  default     = null
}

variable "authorized_networks" {
  description = "List of authorized networks for public IP access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}
