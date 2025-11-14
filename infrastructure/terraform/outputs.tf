output "hello_world_function_url" {
  description = "Public URL of the deployed Hello World Cloud Function"
  value       = module.hello_world.function_url
}

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

# ===========================================================================
# API Gateway Outputs
# ===========================================================================

output "api_gateway_url" {
  description = "The public URL of the deployed API Gateway"
  value       = module.api_gateway.api_gateway_url
}

output "api_gateway_id" {
  description = "The ID of the API Gateway"
  value       = module.api_gateway.api_gateway_id
}

output "api_gateway_service_account" {
  description = "The service account email used by API Gateway"
  value       = module.api_gateway.service_account_email
}
