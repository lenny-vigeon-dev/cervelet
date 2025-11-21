output "dashboard_id" {
  description = "Firestore operations dashboard ID"
  value       = google_monitoring_dashboard.firestore_operations.id
}

output "pubsub_alert_policy_ids" {
  description = "Pub/Sub queue depth alert policy IDs"
  value       = [for policy in google_monitoring_alert_policy.pubsub_queue_depth : policy.id]
}

output "function_error_alert_policy_ids" {
  description = "Cloud Function error rate alert policy IDs"
  value       = [for policy in google_monitoring_alert_policy.function_error_rate : policy.id]
}
