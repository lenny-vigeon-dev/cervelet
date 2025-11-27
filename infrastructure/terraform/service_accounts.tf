// Service accounts for serverless functions
// Names follow convention: <module>-svc@<project>.iam.gserviceaccount.com

resource "google_service_account" "proxy" {
  account_id   = "proxy-svc"
  display_name = "proxy service account"
  description  = "Service account for the proxy Cloud Run service. Handles authenticated calls to internal serverless endpoints with minimal privileges (Run Invoker only)."
}

resource "google_service_account" "write_pixels" {
  account_id   = "write-pixels-svc"
  display_name = "write-pixels service account"
  description  = "Service account for the write-pixels function. Provides restricted Firestore write access to store pixel data and publish related events if needed."
}

resource "google_service_account" "snap" {
  account_id   = "snap-svc"
  display_name = "snap service account"
  description  = "Service account for the snap function. Grants read-only access to Firestore and permission to call internal Cloud Run services when required."
}

resource "google_service_account" "discord_cmd" {
  account_id   = "discord-cmd-svc"
  display_name = "discord-cmd service account"
  description  = "Service account for the Discord command handler. Allows invoking internal services, reading/writing Firestore documents, and publishing command-related events."
}

resource "google_service_account" "cloudrun_sa" {
  account_id   = "cloudrun-svc"
  display_name = "cloudrun service account"
  description  = "Service account used by Cloud Run services that need to publish to Pub/Sub."
}

// Project-level IAM bindings (minimal recommended roles)

resource "google_project_iam_member" "proxy_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.proxy.email}"
}

resource "google_project_iam_member" "write_pixels_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.write_pixels.email}"
}

resource "google_project_iam_member" "snap_datastore_viewer" {
  project = var.project_id
  role    = "roles/datastore.viewer"
  member  = "serviceAccount:${google_service_account.snap.email}"
}

resource "google_project_iam_member" "snap_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.snap.email}"
}

resource "google_project_iam_member" "snap_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.snap.email}"
}

resource "google_project_iam_member" "discord_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.discord_cmd.email}"
}

resource "google_project_iam_member" "discord_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.discord_cmd.email}"
}

resource "google_project_iam_member" "discord_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.discord_cmd.email}"
}

resource "google_project_iam_member" "cloudrun_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

// Note: Assigning roles at the project level is simpler and acceptable for many setups,
// but for stricter least-privilege you can attach roles to individual resources
// (for example, granting run.invoker on a specific Cloud Run service). If you
// prefer that approach, tell me which exact services should receive the binding.
