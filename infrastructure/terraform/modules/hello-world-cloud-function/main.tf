resource "google_project_service" "cloudfunctions" {
  service                    = "cloudfunctions.googleapis.com"
  disable_on_destroy         = true
  disable_dependent_services = true
}

resource "google_project_service" "run" {
  service                    = "run.googleapis.com"
  disable_on_destroy         = true
  disable_dependent_services = true
}

resource "google_project_service" "cloudbuild" {
  service                    = "cloudbuild.googleapis.com"
  disable_on_destroy         = true
  disable_dependent_services = true
}

resource "google_project_service" "artifactregistry" {
  service                    = "artifactregistry.googleapis.com"
  disable_on_destroy         = true
  disable_dependent_services = true
}

resource "google_storage_bucket" "function_bucket" {
  name                        = "${var.project_id}-${var.name}-bucket"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
}

data "archive_file" "function_zip" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/function.zip"
}

resource "google_storage_bucket_object" "function_archive" {
  name   = "${var.name}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_zip.output_path
}

resource "google_cloudfunctions2_function" "function" {
  name        = var.name
  location    = var.region
  description = var.description

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_archive.name
      }
    }
  }

  service_config {
    available_memory      = var.memory
    timeout_seconds       = var.timeout
    max_instance_count    = var.max_instances
    environment_variables = var.env
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.cloudbuild,
    google_project_service.artifactregistry
  ]
}

resource "google_cloud_run_service_iam_binding" "invokers" {
  location = var.region
  service  = google_cloudfunctions2_function.function.service_config[0].service
  role     = "roles/run.invoker"
  members  = var.invokers
}

