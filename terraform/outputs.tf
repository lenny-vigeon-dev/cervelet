output "hello_world_function_url" {
  description = "Public URL of the deployed Hello World Cloud Function"
  value       = module.hello_world.function_url
}

# Cloud SQL outputs
output "database_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.cloud_sql.instance_name
}

output "database_connection_name" {
  description = "Cloud SQL connection name for Cloud SQL Proxy"
  value       = module.cloud_sql.connection_name
}

output "database_public_ip" {
  description = "Public IP address of the Cloud SQL instance"
  value       = module.cloud_sql.public_ip_address
}

output "database_url_cloudsql" {
  description = "Database URL for Cloud Run/Functions (Unix socket)"
  value       = module.cloud_sql.database_url_cloudsql
  sensitive   = true
}

output "database_url_external" {
  description = "Database URL for external connections"
  value       = module.cloud_sql.database_url_external
  sensitive   = true
}
