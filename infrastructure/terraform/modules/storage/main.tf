resource "google_storage_bucket" "canvas_snapshots" {
  name          = "${var.project_id}-canvas-snapshots"
  location      = var.region
  force_destroy = var.environment == "dev" ? true : false

  uniform_bucket_level_access = true

  # Versioning for backup safety
  versioning {
    enabled = var.enable_versioning
  }

  # Lifecycle rules to manage old snapshots
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age                   = var.snapshot_retention_days
      matches_prefix        = ["canvas/historical/"]
    }
  }

  # Move historical snapshots to NEARLINE storage after 7 days
  lifecycle_rule {
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age                   = 7
      matches_prefix        = ["canvas/historical/"]
    }
  }

  # CORS configuration for frontend access
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }

  labels = var.labels
}

# Make only canvas/latest.png publicly readable
# Grant public read access to the latest canvas snapshot object only.
resource "google_storage_object_acl" "latest_png_public" {
  bucket = google_storage_bucket.canvas_snapshots.name
  object = "canvas/latest.png"
  role_entity = [
    "READER:allUsers"
  ]
}

# Service account for Cloud Functions to write snapshots
resource "google_service_account" "snapshot_generator" {
  count        = var.create_service_account ? 1 : 0
  account_id   = "${var.project_name}-snapshot-gen"
  display_name = "Canvas Snapshot Generator Service Account"
  description  = "Service account for Cloud Function that generates canvas snapshots"
}

# Grant storage admin to service account
resource "google_storage_bucket_iam_member" "snapshot_generator_admin" {
  count  = var.create_service_account ? 1 : 0
  bucket = google_storage_bucket.canvas_snapshots.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.snapshot_generator[0].email}"
}

# Grant Firestore access to service account
resource "google_project_iam_member" "snapshot_generator_firestore" {
  count   = var.create_service_account ? 1 : 0
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.snapshot_generator[0].email}"
}

# Cloud Storage notification (optional - for triggering functions on upload)
resource "google_storage_notification" "snapshot_notification" {
  count             = var.enable_notifications ? 1 : 0
  bucket            = google_storage_bucket.canvas_snapshots.name
  payload_format    = "JSON_API_V1"
  topic             = var.notification_topic
  event_types       = ["OBJECT_FINALIZE"]
  object_name_prefix = "canvas/latest"

  depends_on = [google_storage_bucket.canvas_snapshots]
}
