output "discord_cmd_requests_topic_id" {
  description = "The ID of the discord-cmd-requests topic"
  value       = google_pubsub_topic.discord_cmd_requests.id
}

output "discord_cmd_requests_topic_name" {
  description = "The name of the discord-cmd-requests topic"
  value       = google_pubsub_topic.discord_cmd_requests.name
}

output "write_pixel_requests_topic_id" {
  description = "The ID of the write-pixel-requests topic"
  value       = google_pubsub_topic.write_pixel_requests.id
}

output "write_pixel_requests_topic_name" {
  description = "The name of the write-pixel-requests topic"
  value       = google_pubsub_topic.write_pixel_requests.name
}

output "snapshot_requests_topic_id" {
  description = "The ID of the snapshot-requests topic"
  value       = google_pubsub_topic.snapshot_requests.id
}

output "snapshot_requests_topic_name" {
  description = "The name of the snapshot-requests topic"
  value       = google_pubsub_topic.snapshot_requests.name
}

output "pixel_updates_events_topic_id" {
  description = "The ID of the pixel-updates-events topic"
  value       = google_pubsub_topic.pixel_updates_events.id
}

output "pixel_updates_events_topic_name" {
  description = "The name of the pixel-updates-events topic"
  value       = google_pubsub_topic.pixel_updates_events.name
}

output "all_topic_names" {
  description = "List of all topic names"
  value = [
    google_pubsub_topic.discord_cmd_requests.name,
    google_pubsub_topic.write_pixel_requests.name,
    google_pubsub_topic.snapshot_requests.name,
    google_pubsub_topic.pixel_updates_events.name
  ]
}
