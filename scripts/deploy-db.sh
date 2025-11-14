#!/bin/bash
set -e

# Deploy Cloud SQL database using Terraform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

echo "🚀 Deploying Cloud SQL Database..."

# Check if terraform.tfvars exists
if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    echo "❌ terraform.tfvars not found!"
    echo "📝 Please copy terraform.tfvars.example to terraform.tfvars and configure it:"
    echo "   cd terraform"
    echo "   cp terraform.tfvars.example terraform.tfvars"
    echo "   # Edit terraform.tfvars with your values"
    exit 1
fi

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Not authenticated with gcloud"
    echo "🔑 Please run: gcloud auth application-default login"
    exit 1
fi

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable sqladmin.googleapis.com
gcloud services enable servicenetworking.googleapis.com

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
echo "✅ Database deployed successfully!"
echo ""
echo "📊 Database Information:"
terraform output database_instance_name
terraform output database_connection_name
terraform output database_public_ip

echo ""
echo "📝 Next steps:"
echo "1. Set up Cloud SQL Proxy: ./scripts/setup-db-proxy.sh"
echo "2. Run Prisma migrations: ./scripts/migrate-db.sh"
