# Cloud SQL PostgreSQL Instance for PixelHub (r/place clone)

resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-${var.environment}"
  database_version = var.database_version
  region           = var.region
  project          = var.project_id

  # Prevent accidental deletion
  deletion_protection = var.deletion_protection

  settings {
    # Tier determines CPU/RAM - adjust based on load
    # db-f1-micro: 1 vCPU, 614 MB (dev/test)
    # db-g1-small: 1 vCPU, 1.7 GB (small production)
    # db-custom-2-7680: 2 vCPU, 7.5 GB (medium production)
    tier = var.tier

    # Enable automatic backups
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # Enable auto-scaling for storage
    disk_autoresize       = true
    disk_autoresize_limit = var.max_disk_size
    disk_size             = var.initial_disk_size
    disk_type             = "PD_SSD"

    # IP configuration
    ip_configuration {
      ipv4_enabled    = var.public_ip_enabled
      private_network = var.vpc_network
      require_ssl     = false # Set to true for production with SSL certs

      # Authorized networks (if using public IP)
      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.cidr
        }
      }
    }

    # Database flags for PostgreSQL optimization
    database_flags {
      name  = "max_connections"
      value = var.max_connections
    }

    database_flags {
      name  = "shared_buffers"
      value = "262144" # 2GB in 8KB pages
    }

    database_flags {
      name  = "work_mem"
      value = "16384" # 128MB in KB
    }

    # Enable Query Insights for monitoring
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = false
      record_client_address   = false
    }

    # Maintenance window
    maintenance_window {
      day          = 7 # Sunday
      hour         = 3 # 3 AM
      update_track = "stable"
    }
  }
}

# Create the database
resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# Create the database user
resource "google_sql_user" "user" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = var.database_password
  project  = var.project_id
}

# Generate the connection string for Prisma
locals {
  # For Cloud Run or Cloud Functions, use Unix socket connection
  connection_name = google_sql_database_instance.main.connection_name

  # PostgreSQL connection string format for Prisma
  # For Cloud Run: postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/CONNECTION_NAME
  # For external: postgresql://USER:PASSWORD@HOST:5432/DATABASE
  database_url_cloudsql = "postgresql://${var.database_user}:${var.database_password}@/${var.database_name}?host=/cloudsql/${local.connection_name}"
  database_url_external = "postgresql://${var.database_user}:${var.database_password}@${google_sql_database_instance.main.public_ip_address}:5432/${var.database_name}"
}
