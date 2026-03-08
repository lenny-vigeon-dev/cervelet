# Pub/Sub Topics for Cervelet Application
#
# This module creates the following Pub/Sub topics:
# - discord-cmd-requests: Receives Discord command requests
# - write-pixel-requests: Receives pixel write requests
# - snapshot-requests: Receives canvas snapshot requests
# - pixel-updates-events: Publishes pixel updates for real-time web

# Discord Command Requests Topic
resource "google_pubsub_topic" "discord_cmd_requests" {
  name    = "discord-cmd-requests"
  project = var.project_id

  labels = var.labels

  # Message retention duration (7 days)
  message_retention_duration = "604800s"
}

# Write Pixel Requests Topic
resource "google_pubsub_topic" "write_pixel_requests" {
  name    = "write-pixel-requests"
  project = var.project_id

  labels = var.labels

  # Message retention duration (7 days)
  message_retention_duration = "604800s"
}

# Snapshot Requests Topic
resource "google_pubsub_topic" "snapshot_requests" {
  name    = "snapshot-requests"
  project = var.project_id

  labels = var.labels

  # Message retention duration (7 days)
  message_retention_duration = "604800s"
}

# Pixel Updates Events Topic
resource "google_pubsub_topic" "pixel_updates_events" {
  name    = "pixel-updates-events"
  project = var.project_id

  labels = var.labels

  # Message retention duration (1 day - real-time events don't need long retention)
  message_retention_duration = "86400s"
}

# ===========================================================================
# Push Subscriptions
# Each subscription pushes messages to the corresponding Cloud Run service.
# Subscriptions are only created when the endpoint URL is provided.
# ===========================================================================

# Write Pixel Requests -> write-pixels-worker
resource "google_pubsub_subscription" "write_pixel_requests_sub" {
  count = var.write_pixels_worker_url != "" ? 1 : 0

  name    = "write-pixel-requests-sub"
  topic   = google_pubsub_topic.write_pixel_requests.id
  project = var.project_id

  labels = var.labels

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s" # 7 days

  push_config {
    push_endpoint = var.write_pixels_worker_url

    oidc_token {
      service_account_email = var.write_pixels_sa_email
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.write_pixel_requests_dlq.id
    max_delivery_attempts = 10
  }

  depends_on = [google_pubsub_topic.write_pixel_requests_dlq]
}

# Discord Command Requests -> discord-cmd-worker
resource "google_pubsub_subscription" "discord_cmd_requests_sub" {
  count = var.discord_cmd_worker_url != "" ? 1 : 0

  name    = "discord-cmd-requests-sub"
  topic   = google_pubsub_topic.discord_cmd_requests.id
  project = var.project_id

  labels = var.labels

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s"

  push_config {
    push_endpoint = var.discord_cmd_worker_url

    oidc_token {
      service_account_email = var.discord_cmd_sa_email
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.discord_cmd_requests_dlq.id
    max_delivery_attempts = 10
  }

  depends_on = [google_pubsub_topic.discord_cmd_requests_dlq]
}

# Snapshot Requests -> canvas-snapshot-generator
resource "google_pubsub_subscription" "snapshot_requests_sub" {
  count = var.snapshot_generator_url != "" ? 1 : 0

  name    = "snapshot-requests-sub"
  topic   = google_pubsub_topic.snapshot_requests.id
  project = var.project_id

  labels = var.labels

  ack_deadline_seconds       = 120
  message_retention_duration = "604800s"

  push_config {
    push_endpoint = var.snapshot_generator_url

    oidc_token {
      service_account_email = var.snapshot_sa_email
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.snapshot_requests_dlq.id
    max_delivery_attempts = 5
  }

  depends_on = [google_pubsub_topic.snapshot_requests_dlq]
}

# ===========================================================================
# Dead Letter Topics
# ===========================================================================

resource "google_pubsub_topic" "write_pixel_requests_dlq" {
  name    = "write-pixel-requests-dlq"
  project = var.project_id
  labels  = var.labels
}

resource "google_pubsub_topic" "discord_cmd_requests_dlq" {
  name    = "discord-cmd-requests-dlq"
  project = var.project_id
  labels  = var.labels
}

resource "google_pubsub_topic" "snapshot_requests_dlq" {
  name    = "snapshot-requests-dlq"
  project = var.project_id
  labels  = var.labels
}
