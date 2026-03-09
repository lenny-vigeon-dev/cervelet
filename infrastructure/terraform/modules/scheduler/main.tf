# ===========================================================================
# IAM: Grant Cloud Scheduler service agent publish access to the topic
# ===========================================================================

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_pubsub_topic_iam_member" "scheduler_publisher" {
  project = var.project_id
  topic   = var.snapshot_topic_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# ===========================================================================
# Cloud Scheduler Job
# ===========================================================================

resource "google_cloud_scheduler_job" "canvas_snapshot" {
  name             = "${var.job_name_prefix}-canvas-snapshot"
  description      = "Triggers canvas snapshot generation every ${var.schedule_interval} via Pub/Sub"
  schedule         = var.schedule
  time_zone        = var.time_zone
  region           = var.region
  attempt_deadline = var.attempt_deadline

  retry_config {
    retry_count          = var.retry_count
    max_retry_duration   = var.max_retry_duration
    min_backoff_duration = var.min_backoff_duration
    max_backoff_duration = var.max_backoff_duration
    max_doublings        = var.max_doublings
  }

  pubsub_target {
    topic_name = var.snapshot_topic_id
    data = base64encode(jsonencode({
      canvasId = var.canvas_id
    }))
  }
}
