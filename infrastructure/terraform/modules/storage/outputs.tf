output "bucket_name" {
  description = "Name of the canvas snapshots bucket"
  value       = google_storage_bucket.canvas_snapshots.name
}

output "bucket_url" {
  description = "URL of the canvas snapshots bucket"
  value       = google_storage_bucket.canvas_snapshots.url
}

output "bucket_self_link" {
  description = "Self link of the canvas snapshots bucket"
  value       = google_storage_bucket.canvas_snapshots.self_link
}

output "service_account_email" {
  description = "Email of the snapshot generator service account"
  value       = var.create_service_account ? google_service_account.snapshot_generator[0].email : null
}

output "latest_snapshot_url" {
  description = "Public URL for the latest canvas snapshot"
  value       = "https://storage.googleapis.com/${google_storage_bucket.canvas_snapshots.name}/canvas/latest.png"
}
