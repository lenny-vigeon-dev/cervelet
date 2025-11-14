# PixelHub (Cervelet)

A collaborative pixel canvas application inspired by r/place, built with Google Cloud Platform serverless architecture.

## 📚 Documentation

Complete documentation is available in the [`docs/`](docs/) directory:

- **[Documentation Index](docs/README.md)** - Overview of all documentation
- **[Database Quick Start](docs/database/quickstart.md)** - Quick reference for database operations
- **[Database Deployment](docs/database/deployment.md)** - Complete Cloud SQL deployment guide
- **[OAuth Authentication](docs/oauth-authentication.md)** - Authentication setup

## 🏗️ Project Structure

```
cervelet/
├── backend/              # NestJS backend application
├── frontend/             # Next.js frontend application
├── terraform/            # Infrastructure as Code
│   └── modules/
│       ├── cloud-sql/    # PostgreSQL database module
│       └── hello-world-cloud-function/
├── scripts/              # Deployment and utility scripts
└── docs/                 # Project documentation
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
brew install terraform cloud-sql-proxy pnpm  # macOS

# Authenticate with GCP
gcloud auth login
gcloud config set project serverless-tek89
```

### 1. Initial GCP Setup

Create a Google Cloud Storage bucket for Terraform state:
```bash
gsutil mb -l europe-west1 gs://serverless-tek89-terraform-state-bucket/
gsutil versioning set on gs://serverless-tek89-terraform-state-bucket/
```

### 2. Deploy Database

```bash
# Configure database settings
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Deploy Cloud SQL
./scripts/deploy-db.sh
```

### 3. Set Up Local Development

```bash
# Start Cloud SQL Proxy
./scripts/setup-db-proxy.sh

# Configure backend
cd backend
cp .env.example .env
# Edit .env with your database password

# Run migrations
./scripts/migrate-db.sh

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

- **Database Setup**: See [docs/database/deployment.md](docs/database/deployment.md)
- **Daily Development**: See [docs/database/quickstart.md](docs/database/quickstart.md)
- **Backend Documentation**: See [backend/README.md](backend/README.md)
- **Frontend Documentation**: See [frontend/README.md](frontend/README.md)

## 🛠️ Available Scripts

All scripts are located in the `scripts/` directory:

- `./scripts/deploy-db.sh` - Deploy Cloud SQL database
- `./scripts/setup-db-proxy.sh` - Start Cloud SQL Proxy for local development
- `./scripts/stop-db-proxy.sh` - Stop Cloud SQL Proxy
- `./scripts/migrate-db.sh` - Run Prisma migrations

## 🏛️ Architecture

- **Frontend**: Next.js with Server Actions
- **Backend**: NestJS REST API
- **Database**: PostgreSQL on Google Cloud SQL
- **Infrastructure**: Google Cloud Platform (Cloud Functions, Cloud Run)
- **IaC**: Terraform

## 👥 Team

Project by Epitech students for the G-CLO-910-PAR-9-1 module.

## 📝 License

This project is part of the Epitech curriculum.