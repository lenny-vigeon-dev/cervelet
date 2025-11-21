# Cloud Scheduler Module

This Terraform module creates a Cloud Scheduler job to trigger the canvas snapshot generator function periodically.

## Features

- Configurable schedule (cron format)
- Retry logic with exponential backoff
- OIDC authentication to Cloud Function
- Customizable deadlines and timeouts

## Usage

```hcl
module "scheduler" {
  source = "./modules/scheduler"

  region                = "europe-west1"
  cloud_function_url    = "https://europe-west1-PROJECT_ID.cloudfunctions.net/canvas-snapshot-generator"
  service_account_email = "snapshot-gen@PROJECT_ID.iam.gserviceaccount.com"

  # Run every 5 minutes
  schedule          = "*/5 * * * *"
  schedule_interval = "5 minutes"

  canvas_id = "main-canvas"
}
```

## Schedule Examples

- Every 5 minutes: `*/5 * * * *`
- Every 15 minutes: `*/15 * * * *`
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at midnight: `0 0 * * *`

## Inputs

See `variables.tf` for all available inputs.

## Outputs

- `job_name` - Name of the Cloud Scheduler job
- `job_id` - Full resource ID of the job
- `schedule` - Cron schedule of the job
