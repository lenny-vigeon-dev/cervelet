/**
 * Outputs for API Gateway Infrastructure
 *
 * These outputs expose critical information about the deployed API Gateway
 * for use by other modules or for external reference.
 */

output "api_gateway_url" {
  description = "The public URL of the deployed API Gateway"
  value       = google_api_gateway_gateway.gateway.default_hostname
}

output "api_gateway_id" {
  description = "The ID of the API Gateway"
  value       = google_api_gateway_gateway.gateway.gateway_id
}

output "api_config_id" {
  description = "The ID of the API Gateway configuration"
  value       = google_api_gateway_api_config.api_config.api_config_id
}

output "service_account_email" {
  description = "The email of the service account used by API Gateway"
  value       = google_service_account.api_gateway_config.email
}

output "backend_cloud_run_service" {
  description = "The backend Cloud Run service name"
  value       = var.proxy_cloud_run_service_name
}
