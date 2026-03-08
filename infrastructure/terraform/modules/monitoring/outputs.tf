output "dashboard_id" {
  description = "Operations dashboard ID"
  value       = google_monitoring_dashboard.operations.id
}

output "pubsub_alert_policy_ids" {
  description = "Pub/Sub queue depth alert policy IDs"
  value       = [for policy in google_monitoring_alert_policy.pubsub_queue_depth : policy.id]
}

output "service_error_alert_policy_ids" {
  description = "Cloud Run error rate alert policy IDs"
  value       = [for policy in google_monitoring_alert_policy.service_error_rate : policy.id]
}

output "service_latency_alert_policy_ids" {
  description = "Cloud Run latency alert policy IDs"
  value       = [for policy in google_monitoring_alert_policy.service_latency : policy.id]
}
