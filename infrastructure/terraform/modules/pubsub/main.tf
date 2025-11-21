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
