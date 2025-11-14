# PixelHub (Cervelet)

A collaborative pixel canvas application inspired by r/place, built with Google Cloud Platform serverless architecture.

## 📚 Documentation

Complete documentation is available in the [`docs/`](docs/) directory:

- **[Documentation Index](docs/README.md)** - Overview of all documentation
- **[Database Quick Start](docs/database/quickstart.md)** - Quick reference for database operations
- **[Firestore Setup Guide](docs/database/firestore-setup.md)** - Complete Firestore setup guide
- **[Firestore Data Model](docs/database/firestore-data-model.md)** - Database schema and collections
- **[OAuth Authentication](docs/oauth-authentication.md)** - Authentication setup

## 🏗️ Project Structure

```
cervelet/
├── backend/              # NestJS backend application
├── frontend/             # Next.js frontend application
├── terraform/            # Infrastructure as Code
│   └── modules/
│       ├── firestore/    # Firestore database module
│       └── hello-world-cloud-function/
├── scripts/              # Deployment and utility scripts
└── docs/                 # Project documentation
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
brew install terraform pnpm  # macOS

# Authenticate with GCP
gcloud auth login
gcloud config set project serverless-tek89
gcloud auth application-default login
```

### 1. Initial GCP Setup

Create a Google Cloud Storage bucket for Terraform state:
```bash
gsutil mb -l europe-west1 gs://serverless-tek89-terraform-state-bucket/
gsutil versioning set on gs://serverless-tek89-terraform-state-bucket/
```

### 2. Deploy Database

```bash
# Deploy Firestore database
./scripts/deploy-db.sh
```

### 3. Set Up Local Development

```bash
# Set up Firestore credentials
./scripts/setup-firestore-credentials.sh

# Configure backend
cd backend
cp .env.example .env
# Edit .env with your GCP project ID

# Start backend
pnpm install
pnpm dev
```

### 4. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform apply
```

## 📖 Detailed Guides

- **Database Setup**: See [docs/database/firestore-setup.md](docs/database/firestore-setup.md)
- **Daily Development**: See [docs/database/quickstart.md](docs/database/quickstart.md)
- **Backend Documentation**: See [backend/README.md](backend/README.md)
- **Frontend Documentation**: See [frontend/README.md](frontend/README.md)

## 🛠️ Available Scripts

All scripts are located in the `scripts/` directory:

- `./scripts/deploy-db.sh` - Deploy Firestore database
- `./scripts/setup-firestore-credentials.sh` - Set up service account credentials for local development
- `./scripts/verify-firestore-connection.sh` - Verify Firestore connection and configuration

## 🏛️ Architecture

- **Frontend**: Next.js with Server Actions
- **Backend**: NestJS REST API
- **Database**: Firestore (NoSQL Document Database)
- **Infrastructure**: Google Cloud Platform (Cloud Functions, Cloud Run)
- **IaC**: Terraform

## 👥 Team

Project by Epitech students for the G-CLO-910-PAR-9-1 module.

## 📝 License

This project is part of the Epitech curriculum.