// Service accounts for serverless functions
// Names follow convention: <module>-svc@<project>.iam.gserviceaccount.com
//
// Design decision: proxy-svc is shared by cf-proxy, pixelhub-frontend, and
// firebase-auth-token. All three need Pub/Sub publish + Cloud Run invoke and
// have no write access to Firestore. A dedicated SA per service would add
// granularity but no practical privilege reduction at the current scale.
// This is acceptable for the project scope and can be split later if the
// services diverge in permission requirements.

resource "google_service_account" "proxy" {
  account_id   = "proxy-svc"
  display_name = "proxy service account"
  description  = "Service account for cf-proxy, pixelhub-frontend, and firebase-auth-token. Publishes events to Pub/Sub and invokes internal services."
}

resource "google_service_account" "write_pixels" {
  account_id   = "write-pixels-svc"
  display_name = "write-pixels service account"
  description  = "Service account for the write-pixels-worker. Reads/writes Firestore pixel data, receives Pub/Sub push messages."
}

resource "google_service_account" "snap" {
  account_id   = "snap-svc"
  display_name = "snap service account"
  description  = "Service account for the canvas-snapshot-generator. Reads Firestore, writes PNG snapshots to Cloud Storage."
}

resource "google_service_account" "discord_cmd" {
  account_id   = "discord-cmd-svc"
  display_name = "discord-cmd service account"
  description  = "Service account for the discord-cmd-worker. Reads Firestore, publishes to Pub/Sub for snapshot triggers."
}

// ===========================================================================
// Project-level IAM bindings (least-privilege)
// ===========================================================================

// --- proxy-svc ---
resource "google_project_iam_member" "proxy_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.proxy.email}"
}

resource "google_project_iam_member" "proxy_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.proxy.email}"
}

// --- write-pixels-svc ---
resource "google_project_iam_member" "write_pixels_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.write_pixels.email}"
}

// --- snap-svc ---
resource "google_project_iam_member" "snap_datastore_viewer" {
  project = var.project_id
  role    = "roles/datastore.viewer"
  member  = "serviceAccount:${google_service_account.snap.email}"
}

resource "google_project_iam_member" "snap_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.snap.email}"
}

// --- discord-cmd-svc ---
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

// --- Pub/Sub push subscription OIDC authentication ---
// Push subscriptions authenticate to Cloud Run using OIDC tokens from the
// push_config service accounts. These SAs need roles/run.invoker to invoke
// the target Cloud Run services.

resource "google_project_iam_member" "write_pixels_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.write_pixels.email}"
}

resource "google_project_iam_member" "snap_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.snap.email}"
}

resource "google_project_iam_member" "discord_cmd_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.discord_cmd.email}"
}

// --- Pub/Sub service agent: OIDC token minting ---
// The Pub/Sub service agent must be able to create OIDC tokens for the push
// service accounts. Grant roles/iam.serviceAccountTokenCreator on each SA.

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_service_account_iam_member" "pubsub_token_creator_write_pixels" {
  service_account_id = google_service_account.write_pixels.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_service_account_iam_member" "pubsub_token_creator_snap" {
  service_account_id = google_service_account.snap.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_service_account_iam_member" "pubsub_token_creator_discord_cmd" {
  service_account_id = google_service_account.discord_cmd.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
