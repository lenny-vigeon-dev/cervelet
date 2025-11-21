output "job_name" {
  description = "Name of the Cloud Scheduler job"
  value       = google_cloud_scheduler_job.canvas_snapshot.name
}

output "job_id" {
  description = "Full resource ID of the Cloud Scheduler job"
  value       = google_cloud_scheduler_job.canvas_snapshot.id
}

output "schedule" {
  description = "Cron schedule of the job"
  value       = google_cloud_scheduler_job.canvas_snapshot.schedule
}
