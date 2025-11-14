# PixelHub Cloud SQL Deployment Guide

Complete guide for deploying your PostgreSQL database to Google Cloud SQL with Terraform.

## 📋 Quick Start

### 1. Prerequisites

```bash
# Install required tools
brew install terraform cloud-sql-proxy  # macOS
# For Linux, see ../../terraform/modules/cloud-sql/README.md

# Authenticate with GCP
gcloud auth application-default login
gcloud config set project serverless-tek89
```

### 2. Configure Terraform Variables

```bash
# Copy and edit the configuration file
cd terraform
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values:
# - Set a strong database_password
# - Add your IP to authorized_networks (get it: curl ifconfig.me)
nano terraform.tfvars
```

### 3. Deploy the Database

```bash
# Run the automated deployment script
./scripts/deploy-db.sh

# This will:
# - Enable required GCP APIs
# - Initialize Terraform
# - Create Cloud SQL instance (~10 minutes)
# - Output connection details
```

### 4. Set Up Local Development

```bash
# Start Cloud SQL Proxy (in a separate terminal or background)
./scripts/setup-db-proxy.sh

# Update backend/.env with your database password
cd backend
cp .env.example .env
nano .env  # Set DATABASE_URL with your password
```

### 5. Run Prisma Migrations

```bash
# Apply database schema
./scripts/migrate-db.sh

# For development (creates new migrations):
./scripts/migrate-db.sh dev
```

## 🏗️ Architecture

```
┌─────────────────┐
│  Your Computer  │
│                 │
│  Backend App    │
│  (Port 3000)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Cloud SQL Proxy │
│  (Port 5432)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Google Cloud  │
│                 │
│  Cloud SQL DB   │
│  (PostgreSQL)   │
└─────────────────┘
```

## 🔄 Common Workflows

### Local Development

```bash
# Terminal 1: Start Cloud SQL Proxy
./scripts/setup-db-proxy.sh

# Terminal 2: Run backend
cd backend
pnpm dev

# Terminal 3: Prisma Studio (optional)
cd backend
pnpm prisma studio  # Opens at http://localhost:5555
```

### Deploying Schema Changes

```bash
# 1. Create migration
cd backend
pnpm prisma migrate dev --name add_feature_x

# 2. The migration is automatically applied locally

# 3. For production, deploy the migration
./scripts/migrate-db.sh
```

### Viewing Database

```bash
# Option 1: Prisma Studio (GUI)
cd backend
pnpm prisma studio

# Option 2: psql CLI
gcloud sql connect pixelhub-db-dev --user=pixelhub_user --database=pixelhub

# Option 3: Cloud Console
# https://console.cloud.google.com/sql/instances/pixelhub-db-dev
```

### Monitoring Performance

```bash
# View database metrics in Cloud Console
open "https://console.cloud.google.com/sql/instances/pixelhub-db-dev/metrics"

# Check Query Insights
open "https://console.cloud.google.com/sql/instances/pixelhub-db-dev/query-insights"
```

## 🚀 Production Deployment

### For Cloud Run

1. **Build and deploy your container:**
   ```bash
   gcloud run deploy pixelhub-backend \
     --source . \
     --region europe-west1 \
     --add-cloudsql-instances serverless-tek89:europe-west1:pixelhub-db-dev
   ```

2. **Set environment variables:**
   ```bash
   # Get the Cloud SQL connection string
   cd terraform
   DB_URL=$(terraform output -raw database_url_cloudsql)

   # Set it on Cloud Run
   gcloud run services update pixelhub-backend \
     --set-env-vars DATABASE_URL="$DB_URL"
   ```

### For Cloud Functions

```javascript
// In your function, Prisma will automatically use DATABASE_URL
// from environment variables set via Terraform
```

## 🔧 Troubleshooting

### Can't connect to database

```bash
# Check if Cloud SQL Proxy is running
ps aux | grep cloud-sql-proxy

# Restart the proxy
./scripts/setup-db-proxy.sh

# Test connection
psql "postgresql://pixelhub_user:PASSWORD@127.0.0.1:5432/pixelhub"
```

### Migrations failing

```bash
# Check your .env file
cat backend/.env

# Verify connection name
cd terraform
terraform output database_connection_name

# Check Prisma logs
cd backend
DEBUG=prisma:* pnpm prisma migrate deploy
```

### IP not authorized

```bash
# Get your current IP
curl ifconfig.me

# Add it to terraform/terraform.tfvars
authorized_networks = [
  {
    name = "my-ip"
    cidr = "YOUR.IP.ADDRESS.HERE/32"
  }
]

# Apply changes
cd terraform
terraform apply
```

## 📊 Database Tiers & Costs

| Tier | vCPU | RAM | Use Case | Cost/month* |
|------|------|-----|----------|-------------|
| db-f1-micro | Shared | 614MB | Development | ~$10 |
| db-g1-small | 1 | 1.7GB | Small prod | ~$25 |
| db-custom-2-7680 | 2 | 7.5GB | Medium prod | ~$140 |
| db-custom-4-15360 | 4 | 15GB | Large prod | ~$280 |

*Approximate costs for europe-west1 region. Add ~$0.17/GB/month for storage.

### Scaling for r/place Traffic

For a high-traffic pixel placement app:

1. **Start with:** `db-custom-2-7680` (2 vCPU, 7.5GB RAM)
2. **Add read replicas** for pixel fetching (see [module docs](../../terraform/modules/cloud-sql/README.md))
3. **Enable connection pooling** in Prisma:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     connection_limit = 10  // Per Cloud Run instance
   }
   ```
4. **Monitor Query Insights** and add indexes as needed

## 🔐 Security Best Practices

1. **Strong passwords:** Use 16+ character passwords with symbols
2. **Restrict IPs:** Set specific IPs in `authorized_networks`, not 0.0.0.0/0
3. **Use Private IP:** For production, disable public IP and use VPC
4. **Enable SSL:** Set `require_ssl = true` in Terraform
5. **Rotate passwords:** Quarterly or after team member changes
6. **Enable backups:** Already configured with 7-day retention
7. **IAM roles:** Use service accounts for Cloud Run/Functions

## 📚 Additional Resources

- [Full Cloud SQL Module Docs](../../terraform/modules/cloud-sql/README.md)
- [Prisma with Cloud SQL](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-gcp)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)
- [r/place Architecture Patterns](https://www.reddit.com/r/redditdev/comments/txqr7y/rplace_architecture/)

## 💬 Getting Help

- Check logs: `gcloud sql operations list --instance=pixelhub-db-dev`
- View instance: `gcloud sql instances describe pixelhub-db-dev`
- Community: Reddit r/googlecloud, Stack Overflow
- GCP Support: https://cloud.google.com/support

---

Built with ❤️ for PixelHub (r/place clone)
