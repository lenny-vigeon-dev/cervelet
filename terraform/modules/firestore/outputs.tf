/**
 * Firestore Module Outputs
 */

output "database_name" {
  description = "The name of the Firestore database"
  value       = google_firestore_database.database.name
}

output "database_id" {
  description = "The ID of the Firestore database"
  value       = google_firestore_database.database.id
}

output "database_location" {
  description = "The location of the Firestore database"
  value       = google_firestore_database.database.location_id
}

output "database_type" {
  description = "The type of the Firestore database"
  value       = google_firestore_database.database.type
}

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "service_account_email" {
  description = "The email of the Firestore service account (if created)"
  value       = var.create_service_account ? google_service_account.firestore_sa[0].email : null
}

output "service_account_key_name" {
  description = "Instructions for creating service account key"
  value       = var.create_service_account ? "Run: gcloud iam service-accounts keys create key.json --iam-account=${google_service_account.firestore_sa[0].email}" : null
}

output "connection_info" {
  description = "Firestore connection information"
  value = {
    project_id = var.project_id
    database   = google_firestore_database.database.name
    location   = google_firestore_database.database.location_id
  }
}
