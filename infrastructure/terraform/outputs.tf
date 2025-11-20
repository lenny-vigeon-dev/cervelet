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

# ===========================================================================
# Pub/Sub Outputs
# ===========================================================================

output "pubsub_topic_names" {
  description = "List of all Pub/Sub topic names"
  value       = module.pubsub.all_topic_names
}

output "discord_cmd_requests_topic" {
  description = "Discord command requests topic name"
  value       = module.pubsub.discord_cmd_requests_topic_name
}

output "write_pixel_requests_topic" {
  description = "Write pixel requests topic name"
  value       = module.pubsub.write_pixel_requests_topic_name
}

output "snapshot_requests_topic" {
  description = "Snapshot requests topic name"
  value       = module.pubsub.snapshot_requests_topic_name
}

output "pixel_updates_events_topic" {
  description = "Pixel updates events topic name"
  value       = module.pubsub.pixel_updates_events_topic_name
}
