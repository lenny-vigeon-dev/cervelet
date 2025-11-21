resource "google_cloud_scheduler_job" "canvas_snapshot" {
  name             = "${var.job_name_prefix}-canvas-snapshot"
  description      = "Triggers canvas snapshot generation every ${var.schedule_interval}"
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

  http_target {
    http_method = "POST"
    uri         = var.cloud_function_url

    headers = {
      "Content-Type" = "application/json"
    }

    body = base64encode(jsonencode({
      canvasId = var.canvas_id
    }))

    oidc_token {
      service_account_email = var.service_account_email
    }
  }
}
