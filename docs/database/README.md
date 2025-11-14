# Database Documentation

This directory contains documentation for the PixelHub database infrastructure using Google Cloud Firestore.

## Documentation Index

### Getting Started

- **[quickstart.md](./quickstart.md)** - Quick reference for daily development
  - Common commands and operations
  - Environment variables
  - Code examples
  - Troubleshooting tips

- **[firestore-setup.md](./firestore-setup.md)** - Complete setup guide
  - Prerequisites and installation
  - Step-by-step deployment
  - Local development setup
  - Production deployment
  - Comprehensive troubleshooting

### Architecture and Design

- **[firestore-data-model.md](./firestore-data-model.md)** - NoSQL data model documentation
  - Collections structure
  - Document schemas
  - Indexing strategy
  - Query patterns
  - Performance optimization
  - Comparison with relational model

### Migration

- **[firestore-migration.md](./firestore-migration.md)** - Migration from Cloud SQL
  - Migration strategies
  - Data transformation
  - Import/export procedures
  - Rollback plan
  - Post-migration verification

### Legacy Documentation (Archive)

- **[deployment.md](./deployment.md)** - ⚠️ ARCHIVED: Cloud SQL deployment guide
- **[quickstart-cloudsql.md](./quickstart-cloudsql.md)** - ⚠️ ARCHIVED: Cloud SQL quick reference

---

## Current Database: Firestore

**Type**: NoSQL Document Database (Firestore Native Mode)

**Location**: europe-west1

**Project**: serverless-tek89

### Key Features

- ✅ Serverless and auto-scaling
- ✅ Real-time synchronization
- ✅ Pay-per-usage pricing
- ✅ Automatic backups (PITR enabled)
- ✅ Built-in security rules
- ✅ No instance management required

### Collections

1. **canvases** - Canvas metadata and configuration
2. **pixels** - Individual pixel data with composite IDs
3. **users** - User accounts and statistics
4. **pixelHistory** - Audit trail of all pixel changes

---

## Quick Links

### For New Developers

1. Start with [firestore-setup.md](./firestore-setup.md) for complete setup
2. Use [quickstart.md](./quickstart.md) as daily reference
3. Read [firestore-data-model.md](./firestore-data-model.md) to understand the data structure

### For DevOps/Infrastructure

1. Review Terraform module: `../../terraform/modules/firestore/`
2. Check deployment scripts: `../../scripts/`
3. See [firestore-setup.md](./firestore-setup.md) for production deployment

### For Migration

1. Follow [firestore-migration.md](./firestore-migration.md) for step-by-step migration
2. Use provided scripts for data export/transform/import
3. Verify data integrity with verification scripts

---

## Common Tasks

### Deploy Firestore Database

```bash
# From project root
./scripts/deploy-db.sh
```

### Set Up Local Development

```bash
# Authenticate
gcloud auth application-default login

# Set up credentials
./scripts/setup-firestore-credentials.sh

# Configure environment
cd backend
cp .env.example .env
# Edit .env with your settings

# Install and start
pnpm install
pnpm run start:dev
```

### Verify Connection

```bash
./scripts/verify-firestore-connection.sh
```

### View Data

```bash
# Using gcloud CLI
gcloud firestore documents list canvases
gcloud firestore documents list users
gcloud firestore documents list pixels --limit 10

# Or use GCP Console
# https://console.cloud.google.com/firestore
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     PixelHub Application                    │
│                         (NestJS)                            │
│                                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │            FirestoreService                        │     │
│  │         (Firebase Admin SDK)                       │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Application Default Credentials (ADC)
                      │ or Service Account Key
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Cloud Firestore                         │
│                  (Native Mode)                              │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  canvases   │  │   pixels    │  │    users    │          │
│  │ collection  │  │ collection  │  │ collection  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │pixelHistory │  │   indexes   │                           │
│  │ collection  │  │(composite)  │                           │
│  └─────────────┘  └─────────────┘                           │
│                                                             │
│  Features: Auto-scaling, PITR, Real-time, Security Rules    │
└─────────────────────────────────────────────────────────────┘
```

---

## Development vs Production

### Local Development

- Uses service account key or ADC
- Firestore emulator available for offline work
- No costs during development with emulator
- Full access to GCP Console for debugging

### Production (Cloud Run/Functions)

- Uses Application Default Credentials (ADC) automatically
- No service account key needed
- Workload Identity for secure access
- Automatic scaling with Firestore
- Monitoring via Cloud Monitoring

---

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Use Firestore Security Rules** for client-side access control
3. **Implement least-privilege IAM** for service accounts
4. **Enable audit logging** for production environments
5. **Rotate service account keys** every 90 days
6. **Use VPC Service Controls** for additional isolation

---

## Cost Management

### Monitoring

```bash
# View current month usage
gcloud firestore operations list

# Set up budget alerts in GCP Console
# Billing → Budgets & alerts
```

### Optimization Tips

1. **Minimize reads**: Implement caching strategies
2. **Batch operations**: Group writes into batches (up to 500)
3. **Use pagination**: Limit query results and paginate
4. **Archive old data**: Move historical pixel data to Cloud Storage
5. **Monitor usage**: Set up billing alerts and cost tracking

### Cost Comparison

| Operation | Cloud SQL (Fixed) | Firestore (Pay-per-use) |
|-----------|------------------|------------------------|
| **Idle cost** | ~$10/month | $0 |
| **Storage (1GB)** | Included | $0.18/month |
| **Reads (1M/day)** | Included | ~$18/month |
| **Writes (100K/day)** | Included | ~$5.40/month |
| **Scaling** | Manual upgrade | Automatic |
| **Total (small app)** | ~$10-15/month | ~$24/month |
| **Total (large app)** | ~$100-500/month | ~$50-200/month |

**Verdict**: Firestore is more cost-effective for variable workloads and large-scale applications.

---

## Support and Resources

### Internal Documentation

- Architecture: [firestore-data-model.md](./firestore-data-model.md)
- Setup: [firestore-setup.md](./firestore-setup.md)
- Daily reference: [quickstart.md](./quickstart.md)
- Migration: [firestore-migration.md](./firestore-migration.md)

### External Resources

- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Terraform Firestore Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database)
- [Firestore Best Practices](https://cloud.google.com/firestore/docs/best-practices)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

### Getting Help

1. Check the [Troubleshooting section](./firestore-setup.md#troubleshooting) in setup guide
2. Review [quickstart.md](./quickstart.md) for common commands
3. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-firestore)
4. Open an issue in the project repository

---

## Contributing to Documentation

When updating database documentation:

1. Keep examples up to date with current implementation
2. Update architecture diagrams if structure changes
3. Add troubleshooting entries for common issues
4. Test all commands and code examples
5. Update the version history below

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-01-14 | Migrated from Cloud SQL to Firestore |
| 1.0.0 | 2024-12-XX | Initial Cloud SQL documentation |

---

**Last Updated**: January 14, 2025

**Database**: Firestore Native Mode (v2.0)

**Maintained By**: PixelHub Development Team
