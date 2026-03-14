# Pub/Sub Queue Depth Alert (undelivered messages)
resource "google_monitoring_alert_policy" "pubsub_queue_depth" {
  for_each = toset(var.pubsub_subscriptions)

  display_name = "Pub/Sub Queue Depth - ${each.value}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Undelivered messages > ${var.queue_depth_threshold}"

    condition_threshold {
      filter          = "resource.type = \"pubsub_subscription\" AND resource.labels.subscription_id = \"${each.value}\" AND metric.type = \"pubsub.googleapis.com/subscription/num_undelivered_messages\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.queue_depth_threshold

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels

  documentation {
    content   = "Pub/Sub subscription ${each.value} has more than ${var.queue_depth_threshold} undelivered messages."
    mime_type = "text/markdown"
  }
}

# Cloud Run Service Error Rate Alert
resource "google_monitoring_alert_policy" "service_error_rate" {
  for_each = toset(var.cloud_run_services)

  display_name = "Cloud Run Error Rate - ${each.value}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error rate > ${var.function_error_rate_threshold} errors/sec"

    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${each.value}\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class != \"2xx\" AND metric.labels.response_code_class != \"3xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.function_error_rate_threshold

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = var.notification_channels

  documentation {
    content   = "Cloud Run service ${each.value} error rate exceeds ${var.function_error_rate_threshold} errors/sec."
    mime_type = "text/markdown"
  }
}

# Cloud Run Service Latency Alert (P99)
resource "google_monitoring_alert_policy" "service_latency" {
  for_each = toset(var.cloud_run_services)

  display_name = "Cloud Run Latency - ${each.value}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "P99 latency > ${var.function_execution_time_threshold_ms}ms"

    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${each.value}\" AND metric.type = \"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.function_execution_time_threshold_ms * 1000000 # Convert to nanoseconds

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }
    }
  }

  notification_channels = var.notification_channels

  documentation {
    content   = "Cloud Run service ${each.value} P99 latency exceeds ${var.function_execution_time_threshold_ms}ms."
    mime_type = "text/markdown"
  }
}

# API Gateway 4xx/5xx Error Rate Alert
# NOTE: Enable only after the API Gateway has received traffic (metrics must exist)
resource "google_monitoring_alert_policy" "api_gateway_errors" {
  count = var.enable_api_gateway_alert && var.api_gateway_name != "" ? 1 : 0

  display_name = "API Gateway Error Rate - ${var.api_gateway_name}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "4xx/5xx error rate > ${var.api_error_rate_threshold} errors/sec"

    condition_threshold {
      filter          = "resource.type = \"apigateway.googleapis.com/Gateway\" AND resource.labels.gateway_id = \"${var.api_gateway_name}\" AND metric.type = \"apigateway.googleapis.com/gateway/response_count\" AND metric.labels.response_code_class != \"2xx\" AND metric.labels.response_code_class != \"3xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.api_error_rate_threshold

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = var.notification_channels

  documentation {
    content   = "API Gateway ${var.api_gateway_name} error rate (4xx/5xx) exceeds ${var.api_error_rate_threshold} errors/sec."
    mime_type = "text/markdown"
  }
}

# Firestore & Pub/Sub Operations Dashboard
resource "google_monitoring_dashboard" "operations" {
  project = var.project_id
  dashboard_json = jsonencode({
    displayName = "Cervelet Operations"
    gridLayout = {
      columns = 3
      widgets = [
        {
          title = "Firestore Document Reads"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"firestore_instance\" AND metric.type = \"firestore.googleapis.com/document/read_count\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
            yAxis = { label = "reads/sec" }
          }
        },
        {
          title = "Firestore Document Writes"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"firestore_instance\" AND metric.type = \"firestore.googleapis.com/document/write_count\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
            yAxis = { label = "writes/sec" }
          }
        },
        {
          title = "Cloud Run Request Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.labels.service_name"]
                  }
                }
              }
            }]
            yAxis = { label = "requests/sec" }
          }
        },
        {
          title = "Pub/Sub Undelivered Messages"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"pubsub_subscription\" AND metric.type = \"pubsub.googleapis.com/subscription/num_undelivered_messages\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
            }]
            yAxis = { label = "messages" }
          }
        },
        {
          title = "Cloud Run Instance Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/container/instance_count\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.labels.service_name"]
                  }
                }
              }
            }]
            yAxis = { label = "instances" }
          }
        },
        {
          title = "Cloud Storage Request Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"gcs_bucket\" AND metric.type = \"storage.googleapis.com/api/request_count\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["metric.labels.method"]
                  }
                }
              }
            }]
            yAxis = { label = "requests/sec" }
          }
        }
      ]
    }
  })
}
