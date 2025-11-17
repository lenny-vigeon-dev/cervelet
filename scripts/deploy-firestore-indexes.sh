#!/bin/bash
set -e

# Deploy Firestore Indexes
# This script deploys the Firestore composite indexes defined in firestore.indexes.json

PROJECT_ID="${GCP_PROJECT_ID:-serverless-tek89}"
INDEXES_FILE="backend/firestore.indexes.json"

echo "🔥 Deploying Firestore indexes to project: $PROJECT_ID"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo ""
    echo "To install Firebase CLI:"
    echo "  pnpm install -g firebase-tools"
    echo ""
    echo "Then login:"
    echo "  firebase login"
    echo ""
    exit 1
fi

# Check if indexes file exists
if [ ! -f "$INDEXES_FILE" ]; then
    echo "❌ Indexes file not found: $INDEXES_FILE"
    exit 1
fi

echo "📄 Using indexes file: $INDEXES_FILE"
echo ""

# Deploy indexes using gcloud
echo "Deploying indexes..."
cd backend

# Create indexes from the JSON file
# Note: This uses the gcloud alpha firestore command
gcloud alpha firestore indexes composite create \
    --project="$PROJECT_ID" \
    --database="(default)" \
    --field-config="$(cat firestore.indexes.json)" \
    2>&1 || {
        echo ""
        echo "⚠️  Automatic deployment failed. You can deploy indexes manually:"
        echo ""
        echo "Option 1: Use Firebase Console"
        echo "  1. Go to https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
        echo "  2. Create the following indexes manually:"
        echo ""
        cat firestore.indexes.json | grep -A 10 "collectionGroup" | head -20
        echo ""
        echo "Option 2: Use Firebase CLI"
        echo "  1. Install: pnpm install -g firebase-tools"
        echo "  2. Login: firebase login"
        echo "  3. Init: firebase init firestore (select existing project)"
        echo "  4. Deploy: firebase deploy --only firestore:indexes"
        echo ""
        exit 1
    }

echo ""
echo "✅ Indexes deployment initiated!"
echo ""
echo "Note: Indexes may take 5-10 minutes to build."
echo "Check status at: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
echo ""
echo "Or run:"
echo "  gcloud firestore indexes composite list --project=$PROJECT_ID"
