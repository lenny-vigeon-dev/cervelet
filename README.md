# Epitech Serverless

This is a simple Google Cloud Function that responds with "Hello World!" to any HTTP request.

## Setup from empty google project

Connect gcloud to your project
```bash
gcloud auth login
gcloud config set project <project-id>
```

Create a Google Cloud Storage bucket for Terraform state
```bash
gsutil mb -l europe-west1 gs://serverless-tek89-terraform-state-bucket/
gsutil versioning set on gs://serverless-tek89-terraform-state-bucket/
```


## Deployment

Go to the terraform directory
```bash
cd terraform
```

```bash
terraform init
terraform apply
```