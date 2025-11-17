# Firestore Quick Reference

Quick reference guide for working with Firestore in the PixelHub project.

## One-Time Setup

```bash
# 1. Authenticate with GCP
gcloud auth application-default login

# 2. Deploy Firestore database
./scripts/deploy-db.sh

# 3. Set up service account credentials (for local development)
./scripts/setup-firestore-credentials.sh

# 4. Configure environment variables
cd backend
cp .env.example .env
# Edit .env with your configuration
# Set GCP_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS

# 5. Install dependencies
pnpm install

# 6. Start the application
pnpm run start:dev

# 7. Initialize collections (optional - create initial canvas)
# Collections are created automatically when you write the first document
# Option A: Via gcloud CLI
cd ..
gcloud firestore documents create canvases/main-canvas \
  --project=serverless-tek89 \
  --data='{"id":"main-canvas","width":1000,"height":1000,"version":1,"totalPixels":0}'

# Option B: Let your application create it on first use (recommended)
```

**Note**: Only `canvases` needs initial setup. Other collections (`pixels`, `users`, `pixelHistory`) are populated automatically by your application.

---

## Daily Development Workflow

```bash
# Start the application
cd backend
pnpm run start:dev

# The application will automatically connect to Firestore using
# Application Default Credentials (ADC) or the service account key
```

---

## Common Commands

### Firestore Operations

```bash
# View database information
gcloud firestore databases describe '(default)'

# List collections
gcloud firestore collections list

# View documents in a collection
gcloud firestore documents list canvases
gcloud firestore documents list users
gcloud firestore documents list pixels --limit 10

# Get a specific document
gcloud firestore documents describe canvases/main-canvas

# Create a document (initialize collection)
gcloud firestore documents create canvases/main-canvas \
  --data='{"id":"main-canvas","width":1000,"height":1000,"version":1,"totalPixels":0}'

# Check index status
gcloud firestore indexes composite list
```

---

### Terraform Commands

```bash
cd infrastructure/terraform

# View current infrastructure
terraform show

# View outputs (database info)
terraform output

# View specific output
terraform output firestore_database_name
terraform output firestore_service_account_email

# Update infrastructure
terraform plan
terraform apply

# Destroy infrastructure (WARNING: Deletes all data!)
terraform destroy
```

---

### Application Scripts

```bash
# Deploy Firestore database
./scripts/deploy-db.sh

# Set up service account credentials
./scripts/setup-firestore-credentials.sh

# Verify Firestore connection
./scripts/verify-firestore-connection.sh

# Start Firestore emulator (for local development)
./scripts/setup-firestore-emulator.sh
```

---

## Environment Variables

### Local Development (.env)

```bash
NODE_ENV="development"
PORT="8081"
GCP_PROJECT_ID="serverless-tek89"

# For service account authentication (local development)
GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/firestore-key.json"

# OR use Application Default Credentials (no key file needed)
# Just run: gcloud auth application-default login
```

### Production (Cloud Run/Functions)

```bash
NODE_ENV="production"
GCP_PROJECT_ID="serverless-tek89"

# GOOGLE_APPLICATION_CREDENTIALS is NOT needed in production
# Application Default Credentials (ADC) are used automatically
```

---

## Data Model Overview

### Collections

1. **canvases**: Canvas metadata
   - Document ID: Auto-generated or custom (e.g., `main-canvas`)
   - Fields: `id`, `width`, `height`, `version`, `createdAt`, `updatedAt`, `totalPixels`

2. **pixels**: Individual pixel data
   - Document ID: `{canvasId}_{x}_{y}` (e.g., `main-canvas_100_250`)
   - Fields: `canvasId`, `x`, `y`, `color`, `userId`, `updatedAt`

3. **users**: User information and statistics
   - Document ID: Auto-generated or custom user ID
   - Fields: `id`, `username`, `lastPixelPlaced`, `totalPixelsPlaced`, `createdAt`

4. **pixelHistory**: Audit trail of pixel changes
   - Document ID: Auto-generated
   - Fields: `id`, `canvasId`, `x`, `y`, `color`, `userId`, `createdAt`

---

## Quick Code Examples

### Using FirestoreService

```typescript
import { Injectable } from '@nestjs/common';
import { FirestoreService } from './firestore/firestore.service';

@Injectable()
export class PixelsService {
  constructor(private readonly firestore: FirestoreService) {}

  // Get a pixel
  async getPixel(canvasId: string, x: number, y: number) {
    const pixelId = FirestoreService.createPixelId(canvasId, x, y);
    const doc = await this.firestore.doc('pixels', pixelId).get();
    return doc.data();
  }

  // Create/update a pixel
  async setPixel(canvasId: string, x: number, y: number, color: number, userId: string) {
    const pixelId = FirestoreService.createPixelId(canvasId, x, y);
    await this.firestore.doc('pixels', pixelId).set({
      canvasId,
      x,
      y,
      color,
      userId,
      updatedAt: this.firestore.timestamp(),
    });
  }

  // Query pixels by canvas
  async getCanvasPixels(canvasId: string, limit = 100) {
    const snapshot = await this.firestore
      .collection('pixels')
      .where('canvasId', '==', canvasId)
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data());
  }

  // Batch write multiple pixels
  async setMultiplePixels(pixels: any[]) {
    const batch = this.firestore.batch();

    pixels.forEach(pixel => {
      const pixelId = FirestoreService.createPixelId(pixel.canvasId, pixel.x, pixel.y);
      const ref = this.firestore.doc('pixels', pixelId);
      batch.set(ref, pixel);
    });

    await batch.commit();
  }
}
```

---

## Troubleshooting

### Connection Issues

```bash
# Check authentication
gcloud auth list
gcloud auth application-default login

# Verify credentials
echo $GOOGLE_APPLICATION_CREDENTIALS
ls -la $GOOGLE_APPLICATION_CREDENTIALS

# Verify Firestore connection
./scripts/verify-firestore-connection.sh
```

### Permission Issues

```bash
# Check service account permissions
gcloud projects get-iam-policy serverless-tek89 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SA_EMAIL"

# Grant required permissions
gcloud projects add-iam-policy-binding serverless-tek89 \
  --member="serviceAccount:YOUR_SA_EMAIL" \
  --role="roles/datastore.user"
```

### Index Issues

```bash
# Check index build status
gcloud firestore indexes composite list

# Indexes take 5-10 minutes to build after deployment
# Wait for status to change from "CREATING" to "READY"

# Manually create an index if needed
gcloud firestore indexes composite create \
  --collection-group=pixels \
  --field-config field-path=canvasId,order=ascending \
  --field-config field-path=updatedAt,order=descending
```

---

## Cost Estimation

Firestore uses pay-per-usage pricing:

### Storage
- **$0.18 per GB/month**: Stored data
- **$0.12 per GB/month**: PITR backup (if enabled)

### Operations
- **Reads**: $0.06 per 100,000 reads
- **Writes**: $0.18 per 100,000 writes
- **Deletes**: $0.02 per 100,000 deletes

### Example (Small App)
- 1 GB storage: $0.18/month
- 1M reads/day: ~$18/month
- 100K writes/day: ~$5.40/month
- **Total**: ~$24/month

### Free Tier (Daily)
- 50,000 reads
- 20,000 writes
- 20,000 deletes
- 1 GB storage

---

## Backup and Recovery

### Automatic Backups

Firestore automatically creates daily backups with PITR enabled.

```bash
# List backups
gcloud firestore backups list

# View backup details
gcloud firestore backups describe BACKUP_NAME
```

### Manual Export

```bash
# Export all data
gcloud firestore export gs://your-backup-bucket/firestore-backup

# Export specific collections
gcloud firestore export gs://your-backup-bucket/firestore-backup \
  --collection-ids='canvases,pixels,users'
```

### Restore

```bash
# Import from backup
gcloud firestore import gs://your-backup-bucket/firestore-backup
```

---

## Performance Tips

1. **Use Batch Writes**: Group multiple writes into a single batch (up to 500 operations)
2. **Implement Caching**: Cache frequently accessed data client-side
3. **Pagination**: Use cursors for large result sets
4. **Optimize Queries**: Ensure all queries have appropriate indexes
5. **Denormalize Data**: Store redundant data to avoid multiple reads

---

## Additional Resources

- [Firestore Setup Guide](./firestore-setup.md) - Detailed setup instructions
- [Firestore Data Model](./firestore-data-model.md) - Complete data model documentation
- [Migration Guide](./firestore-migration.md) - Migrating from Cloud SQL
- [Firestore Documentation](https://cloud.google.com/firestore/docs) - Official Google docs
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) - SDK documentation

---

**Need help?** See [firestore-setup.md](./firestore-setup.md) for detailed troubleshooting.
