/**
 * Firestore Database Module
 *
 * This module provisions a Google Cloud Firestore database in Native mode.
 * Firestore is a serverless, NoSQL document database that scales automatically.
 */

# Enable required APIs
resource "google_project_service" "firestore_api" {
  project = var.project_id
  service = "firestore.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "app_engine_api" {
  project = var.project_id
  service = "appengine.googleapis.com"

  disable_on_destroy = false
}

# Create Firestore Database
# Note: Only one Firestore database per project in Native mode
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.location_id
  type        = "FIRESTORE_NATIVE"

  # Concurrency mode controls write consistency
  # OPTIMISTIC: Lower latency, better for high-write workloads
  # PESSIMISTIC: Stronger consistency, better for read-heavy workloads
  concurrency_mode = var.concurrency_mode

  # App Engine integration mode
  # ENABLED: Required if using App Engine
  # DISABLED: Use for standalone Firestore
  app_engine_integration_mode = "DISABLED"

  # Point-in-time recovery (PITR)
  point_in_time_recovery_enablement = var.enable_pitr ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"

  # Deletion protection
  deletion_policy = var.deletion_protection ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"

  depends_on = [
    google_project_service.firestore_api,
    google_project_service.app_engine_api
  ]
}

# Create Firestore Indexes for optimized queries
# Index 1: pixels by canvasId and updatedAt (for recent pixels query)
resource "google_firestore_index" "pixels_by_canvas_updated" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "pixels"

  fields {
    field_path = "canvasId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "updatedAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}

# Index 2: pixels by userId and updatedAt (for user pixel history)
resource "google_firestore_index" "pixels_by_user_updated" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "pixels"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "updatedAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}

# Index 3: pixelHistory by canvasId and createdAt (for canvas history)
resource "google_firestore_index" "pixel_history_by_canvas" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "pixelHistory"

  fields {
    field_path = "canvasId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}

# Index 4: pixelHistory by canvasId, x, y, and createdAt (for specific pixel history)
resource "google_firestore_index" "pixel_history_by_coordinates" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "pixelHistory"

  fields {
    field_path = "canvasId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "x"
    order      = "ASCENDING"
  }

  fields {
    field_path = "y"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}

# Note: Single-field indexes like username are automatically created by Firestore
# and don't need to be explicitly defined here.

# Create a service account for Firestore access (if needed)
resource "google_service_account" "firestore_sa" {
  count        = var.create_service_account ? 1 : 0
  project      = var.project_id
  account_id   = "${var.project_name}-firestore-sa"
  display_name = "Firestore Service Account for ${var.project_name}"
  description  = "Service account for accessing Firestore database"
}

# Grant Firestore permissions to service account
resource "google_project_iam_member" "firestore_datastore_user" {
  count   = var.create_service_account ? 1 : 0
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.firestore_sa[0].email}"
}

# Additional permission for index management
resource "google_project_iam_member" "firestore_index_admin" {
  count   = var.create_service_account ? 1 : 0
  project = var.project_id
  role    = "roles/datastore.indexAdmin"
  member  = "serviceAccount:${google_service_account.firestore_sa[0].email}"
}
