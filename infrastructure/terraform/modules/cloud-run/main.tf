# Cloud Run Services for Cervelet (PixelHub)
#
# Creates Cloud Run v2 services from a map of service configurations.
# Each service gets its own dedicated service account, scaling config,
# and optional secret mounts from Secret Manager.

resource "google_cloud_run_v2_service" "services" {
  for_each = var.services

  name     = each.key
  location = var.region
  project  = var.project_id

  labels = merge(var.labels, {
    service = each.key
  })

  template {
    service_account = each.value.service_account_email

    scaling {
      min_instance_count = each.value.min_instances
      max_instance_count = each.value.max_instances
    }

    timeout = each.value.timeout

    max_instance_request_concurrency = each.value.concurrency

    containers {
      image = each.value.image

      ports {
        container_port = each.value.port
      }

      resources {
        limits = {
          memory = each.value.memory
          cpu    = each.value.cpu
        }
      }

      # Plain environment variables
      dynamic "env" {
        for_each = each.value.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Environment variables sourced from Secret Manager
      dynamic "env" {
        for_each = each.value.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }
    }
  }

  ingress             = each.value.ingress
  deletion_protection = each.value.deletion_protection

  lifecycle {
    ignore_changes = [
      # Ignore image tag changes -- managed by Cloud Build CI/CD
      template[0].containers[0].image,
    ]
  }
}

# Allow unauthenticated access for services that need it (e.g. frontend)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  for_each = {
    for k, v in var.services : k => v if v.allow_unauthenticated
  }

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.services[each.key].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
