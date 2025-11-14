# Firestore outputs
output "firestore_database_name" {
  description = "Firestore database name"
  value       = module.firestore.database_name
}

output "firestore_database_id" {
  description = "Firestore database ID"
  value       = module.firestore.database_id
}

output "firestore_database_location" {
  description = "Firestore database location"
  value       = module.firestore.database_location
}

output "firestore_project_id" {
  description = "GCP project ID for Firestore"
  value       = module.firestore.project_id
}

output "firestore_service_account_email" {
  description = "Firestore service account email (if created)"
  value       = module.firestore.service_account_email
}

output "firestore_connection_info" {
  description = "Firestore connection information"
  value       = module.firestore.connection_info
}
