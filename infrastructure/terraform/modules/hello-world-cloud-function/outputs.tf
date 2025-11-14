output "function_url" {
  description = "Public URL of the deployed Hello World Cloud Function"
  value       = google_cloudfunctions2_function.function.service_config[0].uri
}
