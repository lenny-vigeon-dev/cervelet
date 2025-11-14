output "instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "The connection name for Cloud SQL Proxy (format: project:region:instance)"
  value       = google_sql_database_instance.main.connection_name
}

output "database_name" {
  description = "The name of the database"
  value       = google_sql_database.database.name
}

output "public_ip_address" {
  description = "The public IP address of the instance"
  value       = google_sql_database_instance.main.public_ip_address
}

output "private_ip_address" {
  description = "The private IP address of the instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_url_cloudsql" {
  description = "Database URL for Cloud Run/Cloud Functions (using Unix socket)"
  value       = local.database_url_cloudsql
  sensitive   = true
}

output "database_url_external" {
  description = "Database URL for external connections (using public IP)"
  value       = local.database_url_external
  sensitive   = true
}

output "connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = local.connection_name
}
