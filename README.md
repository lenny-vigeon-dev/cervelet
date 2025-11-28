<div align="center">
  <img src="frontend/public/logo.png" alt="Pixelhub Logo" width="150" />

  # PixelHub

  **A collaborative pixel canvas inspired by r/place**

  Built with serverless architecture on Google Cloud Platform

  [![Live Demo](https://img.shields.io/badge/demo-pixelhub.now-ffa31a?style=for-the-badge)](https://pixelhub.now)
  [![Cloud Run](https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## 🎨 Overview

PixelHub is a collaborative real-time pixel canvas where users can place pixels on a shared 500×500 canvas. Built entirely on Google Cloud Platform using serverless technologies, it features Discord OAuth2 authentication, real-time updates, and a modern React frontend.

🌐 **Live at**: [https://pixelhub.now](https://pixelhub.now)

## ✨ Features

- **Collaborative Canvas**: 1000×1000 pixel canvas shared by all users (but can be infinite!)
- **Real-time Updates**: Server-Sent Events for live pixel placement
- **Discord Authentication**: OAuth2 integration for user management
- **Cooldown System**: 5-minutes cooldown per pixel placement
- **Cloud Native**: Fully serverless on Google Cloud Run
- **Custom Domain**: Professional domain with automatic SSL
- **Docker**: Multi-stage builds for optimized deployments
- **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS v4

## 🏗️ Architecture

```
┌─────────────────────┐
│   User Browser      │
│   pixelhub.now      │
└──────────┬──────────┘
           │ HTTPS
           ↓
┌─────────────────────────────────┐
│  Google Cloud Run (Frontend)    │
│  - Next.js 16 SSR               │
│  - Automatic SSL Certificate    │
│  - Custom Domain Mapping        │
└──────────┬──────────────────────┘
           │ API Requests
           ↓
┌─────────────────────────────────┐
│  Cloud Run (API Gateway)        │
│  - cf-proxy service             │
│  - Discord OAuth2               │
│  - Canvas operations            │
│  - Rate limiting                │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│  Backend Services               │
│  - Firestore (Database)         │
│  - Cloud Functions              │
│  - write-pixels-worker          │
│  - canvas-snapshot-generator    │
└─────────────────────────────────┘
```

## 📁 Project Structure

```
cervelet/
├── frontend/              # Next.js 16 frontend application
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── lib/             # API client & utilities
│   ├── Dockerfile       # Multi-stage Docker build
│   ├── deploy-frontend.sh
│   ├── setup-domain.sh  # Custom domain configuration
│   └── check-dns.sh     # DNS verification tool
├── backend/              # NestJS backend & Cloud Run services
│   ├── src/
│   │   ├── main.ts      # cf-proxy API Gateway entry point
│   │   ├── app.*.ts     # NestJS application files
│   │   ├── functions/
│   │   │   ├── write-pixels-worker/
│   │   │   ├── canvas-snapshot-generator/
│   │   │   └── firebase-auth-token/
│   │   ├── firestore/   # Firestore utilities
│   │   └── types/       # Shared TypeScript types
│   └── Dockerfile       # Backend Docker build
├── discord/              # Discord bot application
│   └── src/             # Bot commands and handlers
├── infrastructure/       # Infrastructure as Code
│   └── terraform/       # Terraform configurations
│       └── modules/
│           ├── api-gateway/
│           └── firestore/
├── docs/                # Project documentation
│   ├── DNS-SETUP-GUIDE.md
│   ├── database/
│   ├── firebase-terraform.md
│   └── oauth-authentication.md
├── scripts/             # Deployment utilities
├── firebase.json        # Firebase emulator config
├── firestore.rules      # Security rules
└── firestore.indexes.json
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
brew install terraform pnpm docker  # macOS

# Or using package managers on Linux
sudo apt-get install terraform    # Debian/Ubuntu
npm install -g pnpm              # Node.js package manager

# Authenticate with GCP
gcloud auth login
gcloud config set project serverless-tek89
gcloud auth application-default login
```

### 1. Clone and Setup

```bash
git clone <repository-url>
cd cervelet
```

### 2. Initial GCP Setup

Create Terraform state bucket:
```bash
gsutil mb -l europe-west1 gs://serverless-tek89-terraform-state-bucket/
gsutil versioning set on gs://serverless-tek89-terraform-state-bucket/
```

### 3. Deploy Database

```bash
# Deploy Firestore database with Terraform
./scripts/deploy-db.sh
```

### 4. Deploy Backend Services

```bash
# Deploy API Gateway (cf-proxy - NestJS backend)
cd backend
pnpm install
pnpm run deploy
# Deploy to Cloud Run

# Deploy pixel writer worker
cd src/functions/write-pixels-worker
pnpm install
pnpm run deploy
# Deploy to Cloud Run

# Deploy canvas snapshot generator
cd ../canvas-snapshot-generator
pnpm install
pnpm run deploy
# Deploy to Cloud Run

# Deploy Discord bot
cd ../../discord
pnpm install
pnpm run deploy
# Deploy to Cloud Run
```

### 5. Deploy Frontend

```bash
cd frontend

# Deploy to Cloud Run
./deploy-frontend.sh

# The frontend will be available at:
# https://frontend-343984406897.europe-west1.run.app
```

### 6. Configure Custom Domain (Optional)

```bash
cd frontend

# 1. Verify domain in Google Search Console
# 2. Run domain setup
./setup-domain.sh

# 3. Add DNS records provided by the script
# 4. Wait 15-60 minutes for SSL certificate

# Verify DNS configuration
./check-dns.sh pixelhub.now
```

See [docs/DNS-SETUP-GUIDE.md](docs/DNS-SETUP-GUIDE.md) for detailed instructions.

## 🛠️ Development

### Local Frontend Development

```bash
cd frontend
pnpm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=https://cf-proxy-343984406897.europe-west1.run.app" > .env.local

# Start development server
pnpm dev
# Open http://localhost:3000
```

### Local Backend Development

```bash
cd backend
pnpm install

# Set up Firestore credentials
../scripts/setup-firestore-credentials.sh

# Configure environment
cp .env.example .env
# Edit .env with your GCP project ID

# Start development server
pnpm dev
```

### Firebase Emulator

```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# The emulator UI will be available at:
# http://localhost:4000
```

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

### Setup Guides
- **[DNS Configuration Guide](docs/DNS-SETUP-GUIDE.md)** - Custom domain setup
- **[Firestore Setup](docs/database/firestore-setup.md)** - Database configuration
- **[OAuth Authentication](docs/oauth-authentication.md)** - Discord OAuth2 setup

### Reference
- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[Database Quick Start](docs/database/quickstart.md)** - Quick reference for DB operations
- **[Firestore Data Model](docs/database/firestore-data-model.md)** - Schema and collections
- **[Firebase vs Terraform](docs/firebase-terraform.md)** - Infrastructure management

### Component Documentation
- **[Frontend README](frontend/README.md)** - Next.js application details
- **[Backend README](backend/README.md)** - Cloud Run services details

## 🧰 Available Scripts

### Deployment Scripts

- `./scripts/deploy-db.sh` - Deploy Firestore database
- `./frontend/deploy-frontend.sh` - Deploy frontend to Cloud Run
- `./frontend/setup-domain.sh` - Configure custom domain
- `./frontend/check-dns.sh [domain]` - Verify DNS configuration

### Development Scripts

- `./scripts/setup-firestore-credentials.sh` - Set up service account credentials
- `./scripts/verify-firestore-connection.sh` - Verify Firestore connection

## 🔐 Security

### Frontend Security Headers
- Content Security Policy (CSP)
- XSS Protection
- Frame Options (Clickjacking prevention)
- HSTS (HTTP Strict Transport Security)
- Referrer Policy
- Permissions Policy

### Authentication
- Discord OAuth2 via API Gateway
- Secure HTTP-only cookies
- Session management with Firebase Auth tokens

### Infrastructure
- Firestore security rules
- Service account isolation
- CORS configuration
- Rate limiting on API endpoints

## 📊 Monitoring

### View Logs

```bash
# Frontend logs
gcloud run services logs read frontend --region=europe-west1

# API Gateway logs
gcloud run services logs read cf-proxy --region=europe-west1

# List all services
gcloud run services list --region=europe-west1
```

### Check Service Status

```bash
# Frontend status
gcloud run services describe frontend --region=europe-west1

# Domain mapping status
gcloud beta run domain-mappings describe --domain=pixelhub.now --region=europe-west1
```

### Performance Metrics

Access Cloud Console for detailed metrics:
- **Requests**: Request count, latency, error rates
- **Container Instances**: CPU, memory, instance count
- **Logs**: Structured logs with filters

## 🚢 Deployment Workflow

### Continuous Deployment

1. **Code Changes**: Push to repository
2. **Build**: Docker images built via Cloud Build
3. **Deploy**: Automatic deployment to Cloud Run
4. **Rollback**: Previous revisions available for instant rollback

### Manual Deployment

```bash
# Build and deploy frontend
cd frontend
./deploy-frontend.sh

# Build Docker image locally
docker build -t frontend .
docker run -p 3000:3000 frontend

# Push to GCR and deploy
gcloud builds submit --tag gcr.io/serverless-tek89/frontend
gcloud run deploy frontend \
  --image gcr.io/serverless-tek89/frontend \
  --region europe-west1
```

## 🌍 Environments

- **Production**: `https://pixelhub.now`
- **Cloud Run URL**: `https://frontend-343984406897.europe-west1.run.app`
- **API Gateway**: `https://cf-proxy-343984406897.europe-west1.run.app`
- **Local Dev**: `http://localhost:3000`

## 🧪 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript 5.0
- **Validation**: Zod
- **Build Tool**: Turbopack

### Backend
- **Runtime**: Node.js 20
- **API Gateway**: Custom proxy service
- **Workers**: Cloud Run containers
- **Database**: Firestore (NoSQL)
- **Auth**: Firebase Authentication

### Infrastructure
- **Platform**: Google Cloud Platform
- **Compute**: Cloud Run (fully managed)
- **Database**: Firestore
- **Storage**: Cloud Storage
- **IaC**: Terraform
- **CI/CD**: Cloud Build
- **Container Registry**: Google Container Registry (GCR)

## 🐛 Troubleshooting

### Frontend Issues

**Domain not accessible:**
```bash
# Check DNS propagation
./frontend/check-dns.sh pixelhub.now

# Verify SSL certificate
gcloud beta run domain-mappings describe --domain=pixelhub.now --region=europe-west1
```

**API connection errors:**
- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check API Gateway service status: `gcloud run services list`
- Review logs: `gcloud run services logs read cf-proxy`

### Backend Issues

**Firestore connection errors:**
```bash
# Verify credentials
./scripts/verify-firestore-connection.sh

# Check service account permissions
gcloud projects get-iam-policy serverless-tek89
```

**Build failures:**
- Check Docker logs: `gcloud builds list`
- Verify Node.js version in Dockerfile
- Ensure environment variables are set

## 👥 Team

Project developed by Epitech students for the G-CLO-910-PAR-9-1 module.

## 📝 License

This project is part of the Epitech curriculum.

---

<div align="center">

**[Live Demo](https://pixelhub.now)** • **[Documentation](docs/README.md)** • **[Report Issue](https://github.com/your-repo/issues)**

Made with ❤️ using Google Cloud Platform

</div>
