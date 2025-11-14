#!/bin/bash

# Deploy cf-proxy using Cloud Build
# This solves the architecture mismatch issue by building on GCP's AMD64 infrastructure

set -e  # Exit on error

# Configuration
PROJECT_ID="serverless-tek89"
REGION="europe-west1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying cf-proxy using Cloud Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
echo -e "${YELLOW}Checking authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}Error: Not authenticated with gcloud${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi

# Set project
echo -e "${YELLOW}Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --quiet

# Build the application locally first
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

echo -e "${YELLOW}Building application...${NC}"
pnpm run build

echo -e "${GREEN}✓ Application built successfully${NC}"
echo ""

# Submit to Cloud Build
echo -e "${YELLOW}Submitting build to Cloud Build...${NC}"
echo -e "${YELLOW}This will build the Docker image on GCP (AMD64) and deploy to Cloud Run${NC}"
echo ""

gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=${PROJECT_ID} \
  --region=${REGION}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe cf-proxy \
  --region ${REGION} \
  --format 'value(status.url)')

echo -e "Service Name: ${GREEN}cf-proxy${NC}"
echo -e "Service URL:  ${GREEN}${SERVICE_URL}${NC}"
echo -e "Region:       ${GREEN}${REGION}${NC}"
echo -e "Ingress:      ${GREEN}internal (private)${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Copy the Service URL above"
echo "2. Update terraform.tfvars:"
echo -e "   ${GREEN}proxy_cloud_run_service_url = \"${SERVICE_URL}\"${NC}"
echo "3. Deploy API Gateway:"
echo -e "   ${GREEN}cd ../infrastructure/terraform${NC}"
echo -e "   ${GREEN}terraform init${NC}"
echo -e "   ${GREEN}terraform apply${NC}"
echo ""
