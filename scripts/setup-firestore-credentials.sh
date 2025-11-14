#!/bin/bash
set -e

# Setup Firestore service account credentials for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
CREDENTIALS_DIR="$PROJECT_ROOT/backend"

echo "🔑 Setting up Firestore service account credentials..."

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Not authenticated with gcloud"
    echo "🔑 Please run: gcloud auth application-default login"
    exit 1
fi

# Navigate to terraform directory to get service account email
cd "$TERRAFORM_DIR"

# Check if Firestore has been deployed
if ! terraform output firestore_service_account_email &>/dev/null; then
    echo "❌ Firestore service account not found"
    echo "📝 Please deploy Firestore first: ./scripts/deploy-db.sh"
    exit 1
fi

# Get service account email
SA_EMAIL=$(terraform output -raw firestore_service_account_email)

if [ -z "$SA_EMAIL" ] || [ "$SA_EMAIL" == "null" ]; then
    echo "⚠️  No service account was created by Terraform"
    echo "📝 You can use Application Default Credentials (ADC) instead:"
    echo "   gcloud auth application-default login"
    exit 0
fi

echo "📧 Service Account: $SA_EMAIL"

# Create credentials directory if it doesn't exist
mkdir -p "$CREDENTIALS_DIR"

KEY_FILE="$CREDENTIALS_DIR/firestore-key.json"

# Check if key file already exists
if [ -f "$KEY_FILE" ]; then
    read -p "⚠️  Key file already exists. Do you want to create a new one? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "✅ Using existing key file"
        echo "📝 Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\""
        exit 0
    fi
    rm "$KEY_FILE"
fi

# Create service account key
echo "🔐 Creating service account key..."
gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SA_EMAIL"

echo ""
echo "✅ Service account key created successfully!"
echo "📁 Key saved to: $KEY_FILE"
echo ""
echo "📝 To use this key, set the environment variable:"
echo "   export GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\""
echo ""
echo "⚠️  SECURITY WARNING:"
echo "   - Never commit this key file to version control!"
echo "   - The key file is already added to .gitignore"
echo "   - For production, use Workload Identity or Application Default Credentials"
echo ""
echo "💡 Add this to your backend/.env file:"
echo "   GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\""
