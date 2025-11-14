#!/bin/bash
set -e

# Deploy Firestore database using Terraform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

echo "🚀 Deploying Firestore Database..."

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Not authenticated with gcloud"
    echo "🔑 Please run: gcloud auth application-default login"
    exit 1
fi

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable firestore.googleapis.com
gcloud services enable appengine.googleapis.com

# Navigate to terraform directory
cd "$TERRAFORM_DIR"

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Plan
echo "📋 Planning infrastructure changes..."
terraform plan -out=tfplan

# Confirm
read -p "⚠️  Do you want to apply these changes? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Apply
echo "✨ Applying Terraform configuration..."
terraform apply tfplan

# Clean up plan file
rm tfplan

# Display outputs
echo ""
echo "✅ Firestore database deployed successfully!"
echo ""
echo "📊 Database Information:"
terraform output firestore_database_name
terraform output firestore_database_location
terraform output firestore_project_id

# Check if service account was created
if terraform output firestore_service_account_email &>/dev/null; then
    echo ""
    echo "🔑 Service Account Created:"
    terraform output firestore_service_account_email
fi

echo ""
echo "📝 Next steps:"
echo "1. Set up service account credentials: ./scripts/setup-firestore-credentials.sh"
echo "2. Update your .env file with GCP_PROJECT_ID"
echo "3. Start your application: cd backend && pnpm run start:dev"
echo ""
echo "📚 See docs/database/firestore-setup.md for detailed setup instructions"
