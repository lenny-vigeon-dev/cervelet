# Firestore Terraform Module

This module provisions a Google Cloud Firestore database in Native mode with optimized indexes for a collaborative pixel art application (r/place clone).

## Features

- **Firestore Native Mode**: Serverless, auto-scaling NoSQL database
- **Point-in-Time Recovery (PITR)**: Backup and restore capabilities
- **Optimized Indexes**: Pre-configured composite indexes for efficient queries
- **Service Account**: Optional service account for application access
- **Deletion Protection**: Configurable protection against accidental deletion

## Resources Created

1. **Firestore Database** (Native mode)
   - Project-wide database (only one per project)
   - Configurable location and concurrency mode
   - PITR enabled by default

2. **Composite Indexes** for optimized queries:
   - `pixels` by `canvasId` and `updatedAt` (recent pixels)
   - `pixels` by `userId` and `updatedAt` (user history)
   - `pixelHistory` by `canvasId` and `createdAt` (canvas history)
   - `pixelHistory` by `canvasId`, `x`, `y`, and `createdAt` (pixel-specific history)
   - `users` by `username` (username lookups)

3. **Service Account** (optional)
   - With `datastore.user` role for read/write access
   - With `datastore.indexAdmin` role for index management

## Prerequisites

1. **GCP Project**: You need an active GCP project
2. **APIs**: The following APIs will be automatically enabled:
   - Firestore API (`firestore.googleapis.com`)
   - App Engine API (`appengine.googleapis.com`)

3. **Terraform**: Version 1.0 or higher
4. **GCP Authentication**: Run `gcloud auth application-default login`

## Usage

### Basic Usage

```hcl
module "firestore" {
  source = "./modules/firestore"

  project_id   = "your-gcp-project-id"
  project_name = "pixelhub"
  location_id  = "europe-west1"
  environment  = "dev"
}
```

### Production Configuration

```hcl
module "firestore" {
  source = "./modules/firestore"

  project_id   = "your-gcp-project-id"
  project_name = "pixelhub"
  location_id  = "nam5"  # Multi-region for higher availability
  environment  = "prod"

  # Production settings
  concurrency_mode     = "PESSIMISTIC"  # Stronger consistency
  enable_pitr          = true           # Enable backups
  deletion_protection  = true           # Prevent accidental deletion
  create_service_account = true         # Create service account
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `project_id` | GCP project ID | `string` | - | yes |
| `project_name` | Project name for resource naming | `string` | - | yes |
| `location_id` | Firestore database location | `string` | `"europe-west1"` | no |
| `concurrency_mode` | OPTIMISTIC or PESSIMISTIC | `string` | `"OPTIMISTIC"` | no |
| `enable_pitr` | Enable Point-in-Time Recovery | `bool` | `true` | no |
| `deletion_protection` | Enable deletion protection | `bool` | `true` | no |
| `create_service_account` | Create service account for Firestore | `bool` | `true` | no |
| `environment` | Environment name (dev/staging/prod) | `string` | `"dev"` | no |

## Outputs

| Name | Description |
|------|-------------|
| `database_name` | Firestore database name |
| `database_id` | Firestore database ID |
| `database_location` | Firestore database location |
| `project_id` | GCP project ID |
| `service_account_email` | Service account email (if created) |
| `connection_info` | Connection information object |

## Firestore Locations

Choose a location based on your needs:

### Regional Locations (Lower latency, single region)
- `europe-west1` - Belgium
- `europe-west2` - London
- `us-central1` - Iowa
- `us-east1` - South Carolina
- `asia-northeast1` - Tokyo

### Multi-Regional Locations (Higher availability, higher latency)
- `nam5` - United States
- `eur3` - Europe

See the [full list of locations](https://cloud.google.com/firestore/docs/locations).

## Concurrency Modes

- **OPTIMISTIC**: Lower latency, higher throughput. Best for write-heavy workloads like r/place.
- **PESSIMISTIC**: Stronger consistency, higher latency. Best for read-heavy workloads requiring strict consistency.

## Point-in-Time Recovery (PITR)

PITR allows you to recover your database to any point in time within the retention period (7 days by default).

**Cost**: Additional charges apply (~$0.12 per GB per month).

**To restore**:
```bash
gcloud firestore databases restore \
  --source-database='(default)' \
  --destination-database='restored-db' \
  --source-backup=<backup-name>
```

## Indexes

The module creates the following composite indexes automatically:

1. **pixels (canvasId, updatedAt DESC)**
   - Query: Get recent pixels for a canvas

2. **pixels (userId, updatedAt DESC)**
   - Query: Get user's pixel history

3. **pixelHistory (canvasId, createdAt DESC)**
   - Query: Get canvas history timeline

4. **pixelHistory (canvasId, x, y, createdAt DESC)**
   - Query: Get history for a specific pixel

5. **users (username)**
   - Query: Find user by username

**Note**: Indexes take a few minutes to build. Check status:
```bash
gcloud firestore indexes composite list --database='(default)'
```

## Service Account

If `create_service_account = true`, a service account will be created with:
- Role: `roles/datastore.user` (read/write access)
- Role: `roles/datastore.indexAdmin` (index management)

### Creating a Key for Local Development

```bash
# Get the service account email from Terraform output
SA_EMAIL=$(terraform output -raw service_account_email)

# Create a key
gcloud iam service-accounts keys create key.json \
  --iam-account=$SA_EMAIL

# Set environment variable for local development
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/key.json"
```

**Security Note**: Never commit service account keys to version control!

## Cost Estimation

Firestore pricing is based on usage:

### Storage
- **$0.18 per GB/month** (stored data)
- **$0.12 per GB/month** (PITR backup)

### Operations
- **Document Reads**: $0.06 per 100,000 reads
- **Document Writes**: $0.18 per 100,000 writes
- **Document Deletes**: $0.02 per 100,000 deletes

### Network
- **Free**: Ingress and same-region egress
- **Egress**: Standard GCP egress pricing

### Example: Small App
- 1 GB data storage: $0.18/month
- 1M reads/day: ~$18/month
- 100K writes/day: ~$5.40/month
- PITR enabled: ~$0.12/month
- **Total**: ~$24/month

### Free Tier (Daily)
- 50,000 document reads
- 20,000 document writes
- 20,000 document deletes
- 1 GB storage

See [Firestore Pricing](https://cloud.google.com/firestore/pricing) for details.

## Security Considerations

1. **Deletion Protection**: Enable in production to prevent accidental database deletion
2. **Firestore Security Rules**: Implement client-side access control
3. **Service Account Keys**: Never commit to version control, use Secret Manager
4. **IAM Roles**: Follow principle of least privilege
5. **Network Security**: Use VPC Service Controls for additional isolation

### Example Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can write
    match /pixels/{pixelId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Users can only update their own data
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Performance Best Practices

1. **Batch Operations**: Use batch writes for multiple documents
2. **Pagination**: Use cursors for large result sets
3. **Caching**: Implement client-side caching
4. **Indexes**: Monitor and optimize query indexes
5. **Real-time Listeners**: Use selectively (they count as reads)

## Monitoring

View Firestore metrics in Cloud Console:
- Operations per second
- Read/write latency
- Document count
- Storage size

Set up alerts for:
- High read/write rates
- Error rates
- Storage thresholds

## Troubleshooting

### Index Build Failures
```bash
# Check index status
gcloud firestore indexes composite list --database='(default)'

# Describe specific index
gcloud firestore indexes composite describe <index-name>
```

### Permission Denied
Ensure service account has required roles:
```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SA_EMAIL"
```

### Database Already Exists
Firestore allows only one database per project in Native mode. To recreate:
1. Disable deletion protection: `deletion_protection = false`
2. Run `terraform destroy`
3. Wait for deletion to complete
4. Re-apply with `terraform apply`

**Warning**: This will delete all data!

## Migrating from Cloud SQL

If migrating from Cloud SQL to Firestore:

1. **Export data** from PostgreSQL
2. **Transform** relational data to documents
3. **Import** into Firestore using batch writes
4. **Verify** data integrity
5. **Update** application code to use Firestore SDK
6. **Test** thoroughly before switching traffic

See the [migration guide](../../docs/database/firestore-migration.md) for details.

## Additional Resources

- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Best Practices](https://cloud.google.com/firestore/docs/best-practices)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [Quotas and Limits](https://cloud.google.com/firestore/quotas)

## Support

For issues or questions:
1. Check the [troubleshooting guide](#troubleshooting)
2. Review [Firestore documentation](https://cloud.google.com/firestore/docs)
3. Open an issue in the project repository
