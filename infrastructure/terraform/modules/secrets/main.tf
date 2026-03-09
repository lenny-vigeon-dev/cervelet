# Secret Manager resources for Cervelet (PixelHub)
#
# Creates Secret Manager secrets and grants accessor roles.
# Secret VALUES are managed outside Terraform (via push-secrets.js or
# the GCP console) to avoid storing sensitive data in state.

resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets

  secret_id = each.key
  project   = var.project_id

  labels = var.labels

  replication {
    auto {}
  }
}

# Grant secretAccessor role to the specified service accounts
resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = merge({}, [
    for secret_key, secret in var.secrets : {
      for accessor in secret.accessors :
      "${secret_key}--${accessor}" => {
        secret_id = secret_key
        member    = accessor
      }
    }
  ]...)

  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.value.secret_id].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value.member
}
