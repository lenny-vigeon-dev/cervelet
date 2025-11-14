# Cloud SQL Deployment Guide for PixelHub

This guide explains how to deploy and manage your PostgreSQL database using Google Cloud SQL with Terraform.

## Prerequisites

1. **GCP Project Setup**
   - You must have a GCP project (serverless-tek89)
   - Billing must be enabled
   - You need appropriate permissions (Editor or Owner role)

2. **Required GCP APIs**
   ```bash
   # Enable required APIs
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable servicenetworking.googleapis.com
   ```

3. **Terraform Installed**
   ```bash
   terraform version  # Should be v1.0+
   ```

4. **Authentication**
   ```bash
   gcloud auth application-default login
   ```

## Deployment Steps

### 1. Configure Variables

Copy the example tfvars file:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:
- `database_password`: Use a strong password (min 12 characters)
- `authorized_networks`: Add your public IP (find it with `curl ifconfig.me`)
- `db_tier`: Choose based on your needs (see options in the file)

### 2. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply changes (creates Cloud SQL instance - takes ~10 minutes)
terraform apply
```

### 3. Get Database Connection Info

After deployment:
```bash
# Get all outputs
terraform output

# Get database URL (for local connections)
terraform output database_url_external

# Get connection name (for Cloud SQL Proxy)
terraform output database_connection_name
```

### 4. Configure Prisma

Update your backend `.env` file with the database URL:

**For local development (using Cloud SQL Proxy - recommended):**
```bash
# In backend/.env
DATABASE_URL="postgresql://pixelhub_user:YOUR_PASSWORD@127.0.0.1:5432/pixelhub"
```

**For production (Cloud Run/Functions):**
```bash
# Will be set automatically via Terraform outputs
DATABASE_URL="postgresql://pixelhub_user:YOUR_PASSWORD@/pixelhub?host=/cloudsql/CONNECTION_NAME"
```

### 5. Run Prisma Migrations

**Option A: Using Cloud SQL Proxy (Recommended for local)**

1. Install Cloud SQL Proxy:
   ```bash
   # macOS
   brew install cloud-sql-proxy

   # Linux/Others
   curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
   chmod +x cloud-sql-proxy
   ```

2. Start the proxy:
   ```bash
   # Get connection name from terraform output
   CONNECTION_NAME=$(cd ../terraform && terraform output -raw database_connection_name)

   # Start proxy in background
   cloud-sql-proxy $CONNECTION_NAME --port 5432 &
   ```

3. Run migrations:
   ```bash
   cd backend
   pnpm prisma migrate deploy
   # OR for development
   pnpm prisma migrate dev
   ```

**Option B: Using Public IP (Quick but less secure)**

1. Ensure your IP is in `authorized_networks` in terraform.tfvars
2. Get the external DATABASE_URL:
   ```bash
   terraform output database_url_external
   ```
3. Update backend/.env with this URL
4. Run migrations:
   ```bash
   cd backend
   pnpm prisma migrate deploy
   ```

## Database Management

### View Database Info
```bash
# List instances
gcloud sql instances list

# Describe instance
gcloud sql instances describe pixelhub-db-dev

# Connect with Cloud SQL Proxy
gcloud sql connect pixelhub-db-dev --user=pixelhub_user
```

### Backup and Restore
```bash
# Manual backup
gcloud sql backups create --instance=pixelhub-db-dev

# List backups
gcloud sql backups list --instance=pixelhub-db-dev

# Restore from backup
gcloud sql backups restore BACKUP_ID --backup-instance=pixelhub-db-dev --restore-instance=pixelhub-db-dev
```

### Monitoring
- Go to [Cloud SQL Console](https://console.cloud.google.com/sql/instances)
- View metrics: CPU, Memory, Connections, Disk
- Enable Query Insights for slow query detection

## Performance Tuning for r/place

For a high-traffic pixel placement app:

1. **Upgrade Database Tier** (in terraform.tfvars):
   ```hcl
   db_tier = "db-custom-2-7680"  # 2 vCPU, 7.5GB RAM
   ```

2. **Add Read Replicas** (add to cloud-sql module):
   ```hcl
   # For read-heavy workloads
   resource "google_sql_database_instance" "read_replica" {
     name                 = "${var.project_name}-db-${var.environment}-replica"
     database_version     = var.database_version
     region               = var.region
     master_instance_name = google_sql_database_instance.main.name

     replica_configuration {
       failover_target = false
     }

     settings {
       tier = var.tier
     }
   }
   ```

3. **Connection Pooling** (recommended for Cloud Run/Functions):
   - Use PgBouncer or Prisma connection pooling
   - Set `connection_limit` in Prisma schema

4. **Optimize Indexes** (already in your schema):
   - `@@index([canvasId, updatedAt(sort: Desc)])` on Pixel
   - Consider adding more indexes based on query patterns

## Costs

Estimated monthly costs (us-central1):
- **db-f1-micro** (dev): ~$10/month
- **db-g1-small** (small prod): ~$25/month
- **db-custom-2-7680** (medium prod): ~$140/month
- **Storage**: ~$0.17/GB/month (SSD)
- **Backup**: ~$0.08/GB/month

## Security Best Practices

1. **Use Private IP** (for production):
   - Set `public_ip_enabled = false`
   - Configure VPC peering
   - Connect via Cloud SQL Proxy or private IP

2. **Enable SSL**:
   - Set `require_ssl = true` in terraform
   - Download SSL certs and configure in DATABASE_URL

3. **Rotate Passwords**:
   ```bash
   gcloud sql users set-password pixelhub_user \
     --instance=pixelhub-db-dev \
     --password=NEW_PASSWORD
   ```

4. **Restrict Networks**:
   - Update `authorized_networks` to specific IPs only
   - Never use 0.0.0.0/0 in production

## Troubleshooting

### Can't connect to database
1. Check if your IP is in authorized_networks
2. Verify the instance is running: `gcloud sql instances list`
3. Test connection: `gcloud sql connect pixelhub-db-dev --user=pixelhub_user`

### Migrations failing
1. Ensure Cloud SQL Proxy is running
2. Check DATABASE_URL format
3. Verify user has correct permissions

### Performance issues
1. Check Query Insights in Cloud Console
2. Review slow queries
3. Consider upgrading tier or adding read replicas
4. Optimize indexes based on query patterns

## Additional Resources

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Prisma with Cloud SQL](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-gcp)
- [Cloud SQL Proxy Guide](https://cloud.google.com/sql/docs/postgres/connect-instance-cloud-sql-proxy)
