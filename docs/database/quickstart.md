# Database Quick Reference 🚀

## Initial Setup (One Time)

```bash
# 1. Configure variables
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit: Set password & add your IP (curl ifconfig.me)

# 2. Deploy database (~10 min)
./scripts/deploy-db.sh

# 3. Configure backend
cd backend
cp .env.example .env
# Edit: Add your database password

# 4. Start proxy
./scripts/setup-db-proxy.sh

# 5. Run migrations
./scripts/migrate-db.sh
```

## Daily Development

```bash
# Start Cloud SQL Proxy (keep running)
./scripts/setup-db-proxy.sh

# Run backend
cd backend && pnpm dev

# View database (optional)
cd backend && pnpm prisma studio
```

## Common Commands

```bash
# Database Management
./scripts/setup-db-proxy.sh       # Start proxy
./scripts/stop-db-proxy.sh        # Stop proxy
./scripts/migrate-db.sh           # Apply migrations
./scripts/migrate-db.sh dev       # Create new migration

# Prisma Commands (in backend/)
pnpm prisma studio                # GUI database viewer
pnpm prisma generate              # Regenerate client
pnpm prisma migrate dev           # Create migration
pnpm prisma migrate deploy        # Apply migrations
pnpm prisma db push               # Sync schema (dev only)

# Terraform Commands (in terraform/)
terraform plan                    # Preview changes
terraform apply                   # Apply changes
terraform output                  # Show all outputs
terraform output database_url_external  # Get connection string
terraform destroy                 # Delete infrastructure

# GCloud Commands
gcloud sql instances list                          # List instances
gcloud sql instances describe pixelhub-db-dev      # Instance details
gcloud sql connect pixelhub-db-dev --user=pixelhub_user  # Connect via psql
gcloud sql backups list --instance=pixelhub-db-dev  # List backups
```

## Connection Strings

**Local (with Cloud SQL Proxy):**
```
postgresql://pixelhub_user:PASSWORD@127.0.0.1:5432/pixelhub
```

**Direct (public IP):**
```
postgresql://pixelhub_user:PASSWORD@PUBLIC_IP:5432/pixelhub
```

**Production (Cloud Run/Functions):**
```
postgresql://pixelhub_user:PASSWORD@/pixelhub?host=/cloudsql/CONNECTION_NAME
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect | `./scripts/setup-db-proxy.sh` |
| Migrations fail | Check `backend/.env` has correct DATABASE_URL |
| IP not authorized | Add IP to `terraform/terraform.tfvars` and run `terraform apply` |
| Proxy won't start | `./scripts/stop-db-proxy.sh` then restart |
| Forgot password | Set new one in terraform.tfvars, run `terraform apply` |

## Quick Links

- [Full Deployment Guide](deployment.md)
- [Cloud SQL Module Docs](../../terraform/modules/cloud-sql/README.md)
- [Cloud Console](https://console.cloud.google.com/sql/instances/pixelhub-db-dev)
- [Prisma Docs](https://www.prisma.io/docs)

## Cost Estimate

- Development (db-f1-micro): ~$10/month
- Production (db-custom-2-7680): ~$140/month
- Storage: ~$0.17/GB/month

## Need Help?

```bash
# Check proxy status
ps aux | grep cloud-sql-proxy

# Test database connection
psql "postgresql://pixelhub_user:PASSWORD@127.0.0.1:5432/pixelhub" -c "SELECT version();"

# View Terraform state
cd terraform && terraform show

# View Cloud SQL logs
gcloud sql operations list --instance=pixelhub-db-dev --limit=10
```
