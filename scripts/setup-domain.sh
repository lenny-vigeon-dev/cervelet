#!/bin/bash

# Script to configure custom domain pixelhub.now on Cloud Run
# Usage: ./setup-domain.sh

set -e

PROJECT_ID="serverless-tek89"
SERVICE_NAME="frontend"
REGION="europe-west1"
DOMAIN="pixelhub.now"

echo "🌐 Configuring custom domain for Cloud Run"
echo "=================================================="
echo "Domain: $DOMAIN"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Check that the service exists
echo "✓ Verifying Cloud Run service..."
gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID > /dev/null

# Create domain mapping
echo ""
echo "📌 Creating domain mapping..."
echo "Note: You must have verified domain ownership in Google Search Console"
echo ""

gcloud beta run domain-mappings create \
  --service $SERVICE_NAME \
  --domain $DOMAIN \
  --region $REGION \
  --project $PROJECT_ID

echo ""
echo "✅ Mapping created successfully!"
echo ""
echo "📋 Retrieving DNS records to configure..."
echo ""

# Display required DNS records
gcloud beta run domain-mappings describe \
  --domain $DOMAIN \
  --region $REGION \
  --project $PROJECT_ID

echo ""
echo "=================================================="
echo "📝 NEXT STEPS:"
echo "=================================================="
echo ""
echo "1. Copy the DNS records displayed above"
echo "2. Add them to your registrar's DNS configuration"
echo "3. Wait for DNS propagation (5-48h, often < 1h)"
echo "4. SSL certificate will be automatically provisioned"
echo ""
echo "To check status:"
echo "  gcloud beta run domain-mappings describe --domain=$DOMAIN --region=$REGION"
echo ""

