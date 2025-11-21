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

# Cloud Function Error Rate Alert
resource "google_monitoring_alert_policy" "function_error_rate" {
  for_each = toset(var.cloud_functions)

  display_name = "Cloud Function Error Rate - ${each.value}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error rate > ${var.function_error_rate_threshold}%"

    condition_threshold {
      filter          = "resource.type = \"cloud_function\" AND resource.labels.function_name = \"${each.value}\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\" AND metric.labels.status != \"ok\""
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
    content   = "Cloud Function ${each.value} error rate exceeds ${var.function_error_rate_threshold}%."
    mime_type = "text/markdown"
  }
}

# Cloud Function Execution Time Alert
resource "google_monitoring_alert_policy" "function_execution_time" {
  for_each = toset(var.cloud_functions)

  display_name = "Cloud Function Execution Time - ${each.value}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Execution time > ${var.function_execution_time_threshold_ms}ms"

    condition_threshold {
      filter          = "resource.type = \"cloud_function\" AND resource.labels.function_name = \"${each.value}\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_times\""
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
    content   = "Cloud Function ${each.value} P99 execution time exceeds ${var.function_execution_time_threshold_ms}ms."
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
    display_name = "4xx/5xx error rate > ${var.api_error_rate_threshold}%"

    condition_threshold {
      filter          = "resource.type = \"apigateway.googleapis.com/Gateway\" AND resource.labels.gateway_id = \"${var.api_gateway_name}\" AND metric.type = \"apigateway.googleapis.com/gateway/response_count\" AND metric.labels.response_code_class = \"4xx\" OR metric.labels.response_code_class = \"5xx\""
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
    content   = "API Gateway ${var.api_gateway_name} error rate (4xx/5xx) exceeds ${var.api_error_rate_threshold}%."
    mime_type = "text/markdown"
  }
}

# Firestore Read/Write Operations Dashboard
resource "google_monitoring_dashboard" "firestore_operations" {
  project = var.project_id
  dashboard_json = jsonencode({
    displayName = "Firestore Operations"
    gridLayout = {
      columns = 2
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
          title = "Firestore Delete Operations"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"firestore_instance\" AND metric.type = \"firestore.googleapis.com/document/delete_count\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
            yAxis = { label = "deletes/sec" }
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
        }
      ]
    }
  })
}
