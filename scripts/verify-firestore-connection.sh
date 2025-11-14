#!/bin/bash
set -e

# Verify Firestore connection and configuration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

echo "🔍 Verifying Firestore connection..."

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Not authenticated with gcloud"
    echo "🔑 Please run: gcloud auth application-default login"
    exit 1
fi

# Get project ID
cd "$TERRAFORM_DIR"
PROJECT_ID=$(terraform output -raw firestore_project_id 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not get project ID from Terraform"
    echo "📝 Please deploy Firestore first: ./scripts/deploy-db.sh"
    exit 1
fi

echo "📊 Project ID: $PROJECT_ID"

# Check Firestore database
echo "🔍 Checking Firestore database..."
gcloud firestore databases list --project="$PROJECT_ID" --format="table(name,type,locationId,createTime)"

# Check indexes
echo ""
echo "🔍 Checking Firestore indexes..."
gcloud firestore indexes composite list --database='(default)' --project="$PROJECT_ID" --format="table(name,state)" || echo "No indexes found (indexes may still be building)"

# Check service account (if created)
SA_EMAIL=$(terraform output -raw firestore_service_account_email 2>/dev/null || echo "")
if [ -n "$SA_EMAIL" ] && [ "$SA_EMAIL" != "null" ]; then
    echo ""
    echo "🔍 Service Account: $SA_EMAIL"
    echo "🔍 Checking service account permissions..."
    gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --filter="bindings.members:serviceAccount:$SA_EMAIL" \
        --format="table(bindings.role)"
fi

echo ""
echo "✅ Firestore verification complete!"
