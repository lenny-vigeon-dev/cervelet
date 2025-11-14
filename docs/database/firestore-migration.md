# Migrating from Cloud SQL (PostgreSQL) to Firestore

This guide provides step-by-step instructions for migrating your PixelHub application from Cloud SQL (PostgreSQL with Prisma) to Firestore (NoSQL).

## Table of Contents

- [Overview](#overview)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Strategy](#migration-strategy)
- [Step-by-Step Migration](#step-by-step-migration)
- [Data Transformation](#data-transformation)
- [Rollback Plan](#rollback-plan)
- [Post-Migration Verification](#post-migration-verification)

---

## Overview

### Why Migrate?

**From: Cloud SQL (PostgreSQL)**
- Relational database with fixed instance costs
- Requires instance management and scaling
- SQL-based queries with JOINs
- ~$10-500/month fixed costs

**To: Firestore (NoSQL)**
- Serverless, auto-scaling NoSQL database
- Pay-per-usage pricing model
- Real-time capabilities built-in
- No instance management required

### What Changes?

| Aspect | Cloud SQL | Firestore |
|--------|-----------|-----------|
| **ORM/SDK** | Prisma | Firebase Admin SDK |
| **Data Model** | Relational tables | Document collections |
| **Queries** | SQL with JOINs | NoSQL queries (no JOINs) |
| **Schema** | Rigid schema with migrations | Flexible, schemaless |
| **Scaling** | Vertical (upgrade instance) | Automatic horizontal |
| **Connection** | Cloud SQL Proxy | Application Default Credentials |
| **Backups** | Manual + PITR | Automatic daily + PITR |

---

## Pre-Migration Checklist

Before starting the migration, ensure:

- [ ] **Backup existing data**: Export all PostgreSQL data
- [ ] **Review data model**: Understand current schema and relationships
- [ ] **Test Firestore setup**: Verify Firestore is properly configured
- [ ] **Create migration scripts**: Prepare data transformation scripts
- [ ] **Set up staging environment**: Test migration in non-production first
- [ ] **Document rollback plan**: Prepare steps to revert if needed
- [ ] **Notify stakeholders**: Inform team of migration timeline
- [ ] **Plan downtime**: Schedule maintenance window if needed

---

## Migration Strategy

### Option 1: Big Bang Migration (Recommended for Small Datasets)

**Suitable for:**
- Small datasets (< 100K documents)
- Low-traffic applications
- Non-critical applications during development

**Steps:**
1. Stop application
2. Export data from PostgreSQL
3. Transform data to Firestore format
4. Import into Firestore
5. Update application code
6. Start application with Firestore

**Downtime:** 30 minutes to 2 hours

---

### Option 2: Dual-Write Migration (Recommended for Production)

**Suitable for:**
- Large datasets (> 100K documents)
- High-traffic applications
- Zero-downtime requirement

**Steps:**
1. Deploy dual-write code (write to both databases)
2. Backfill Firestore with historical data
3. Verify data consistency
4. Switch reads to Firestore
5. Stop writes to PostgreSQL
6. Decommission Cloud SQL

**Downtime:** Zero (rolling migration)

---

### Option 3: Blue-Green Deployment

**Suitable for:**
- Critical applications
- Need for quick rollback

**Steps:**
1. Deploy new version (Firestore) alongside old version (PostgreSQL)
2. Gradually shift traffic to new version
3. Monitor for issues
4. Complete cutover or rollback

**Downtime:** Minimal (during traffic switch)

---

## Step-by-Step Migration

### Phase 1: Preparation

#### 1.1 Export PostgreSQL Data

```bash
# From project root
cd backend

# Export data using Prisma
npx prisma db pull  # Update schema if needed
npx ts-node scripts/export-data.ts  # Custom export script (see below)

# Or export using pg_dump
pg_dump -h localhost -U pixelhub_user -d pixelhub -Fc > backup.dump
```

**Create export script** (`backend/scripts/export-data.ts`):

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  console.log('Exporting data from PostgreSQL...');

  // Export Canvases
  const canvases = await prisma.canvas.findMany();
  fs.writeFileSync('data/canvases.json', JSON.stringify(canvases, null, 2));

  // Export Pixels
  const pixels = await prisma.pixel.findMany();
  fs.writeFileSync('data/pixels.json', JSON.stringify(pixels, null, 2));

  // Export Users
  const users = await prisma.user.findMany();
  fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));

  // Export Pixel History
  const pixelHistory = await prisma.pixelHistory.findMany();
  fs.writeFileSync('data/pixelHistory.json', JSON.stringify(pixelHistory, null, 2));

  console.log('✅ Export complete!');
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# Run export
mkdir -p backend/data
npx ts-node backend/scripts/export-data.ts
```

---

#### 1.2 Deploy Firestore Infrastructure

```bash
# Deploy Firestore using Terraform
./scripts/deploy-db.sh

# Wait for indexes to build (5-10 minutes)
gcloud firestore indexes composite list
```

---

### Phase 2: Data Transformation

#### 2.1 Transform Data Structure

**Create transformation script** (`backend/scripts/transform-data.ts`):

```typescript
import * as fs from 'fs';
import { Timestamp } from 'firebase-admin/firestore';

interface PostgresCanvas {
  id: string;
  width: number;
  height: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface FirestoreCanvas {
  id: string;
  width: number;
  height: number;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalPixels: number;
}

function transformCanvases(postgresData: PostgresCanvas[]): FirestoreCanvas[] {
  return postgresData.map(canvas => ({
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    version: canvas.version,
    createdAt: Timestamp.fromDate(new Date(canvas.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(canvas.updatedAt)),
    totalPixels: 0, // Will be calculated during pixel import
  }));
}

// Similar transformations for Pixels, Users, and PixelHistory
function transformPixels(postgresData: any[]): any[] {
  return postgresData.map(pixel => ({
    canvasId: pixel.canvasId,
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    userId: pixel.userId,
    updatedAt: Timestamp.fromDate(new Date(pixel.updatedAt)),
  }));
}

function transformUsers(postgresData: any[]): any[] {
  return postgresData.map(user => ({
    id: user.id,
    username: user.username,
    lastPixelPlaced: user.lastPixelPlaced
      ? Timestamp.fromDate(new Date(user.lastPixelPlaced))
      : null,
    totalPixelsPlaced: user.totalPixelsPlaced,
    createdAt: Timestamp.fromDate(new Date(user.createdAt)),
  }));
}

function transformPixelHistory(postgresData: any[]): any[] {
  return postgresData.map(history => ({
    id: history.id.toString(), // BigInt to String
    canvasId: history.canvasId,
    x: history.x,
    y: history.y,
    color: history.color,
    userId: history.userId,
    createdAt: Timestamp.fromDate(new Date(history.createdAt)),
  }));
}

async function transformAll() {
  console.log('Transforming data for Firestore...');

  // Read exported data
  const canvases = JSON.parse(fs.readFileSync('data/canvases.json', 'utf-8'));
  const pixels = JSON.parse(fs.readFileSync('data/pixels.json', 'utf-8'));
  const users = JSON.parse(fs.readFileSync('data/users.json', 'utf-8'));
  const pixelHistory = JSON.parse(fs.readFileSync('data/pixelHistory.json', 'utf-8'));

  // Transform
  const transformedCanvases = transformCanvases(canvases);
  const transformedPixels = transformPixels(pixels);
  const transformedUsers = transformUsers(users);
  const transformedPixelHistory = transformPixelHistory(pixelHistory);

  // Save transformed data
  fs.writeFileSync('data/firestore-canvases.json', JSON.stringify(transformedCanvases, null, 2));
  fs.writeFileSync('data/firestore-pixels.json', JSON.stringify(transformedPixels, null, 2));
  fs.writeFileSync('data/firestore-users.json', JSON.stringify(transformedUsers, null, 2));
  fs.writeFileSync('data/firestore-pixelHistory.json', JSON.stringify(transformedPixelHistory, null, 2));

  console.log('✅ Transformation complete!');
}

transformAll().catch(console.error);
```

```bash
# Run transformation
npx ts-node backend/scripts/transform-data.ts
```

---

### Phase 3: Import to Firestore

#### 3.1 Create Import Script

**Create import script** (`backend/scripts/import-to-firestore.ts`):

```typescript
import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'serverless-tek89',
});

const db = admin.firestore();

async function importCollection(
  collectionName: string,
  data: any[],
  getDocId: (item: any) => string,
  batchSize = 500,
) {
  console.log(`Importing ${data.length} documents to ${collectionName}...`);

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = db.batch();
    const chunk = data.slice(i, i + batchSize);

    chunk.forEach(item => {
      const docId = getDocId(item);
      const docRef = db.collection(collectionName).doc(docId);
      batch.set(docRef, item);
    });

    await batch.commit();
    console.log(`  ✓ Imported ${Math.min(i + batchSize, data.length)}/${data.length}`);
  }

  console.log(`✅ ${collectionName} import complete!`);
}

async function importAll() {
  // Read transformed data
  const canvases = JSON.parse(fs.readFileSync('data/firestore-canvases.json', 'utf-8'));
  const pixels = JSON.parse(fs.readFileSync('data/firestore-pixels.json', 'utf-8'));
  const users = JSON.parse(fs.readFileSync('data/firestore-users.json', 'utf-8'));
  const pixelHistory = JSON.parse(fs.readFileSync('data/firestore-pixelHistory.json', 'utf-8'));

  // Import collections
  await importCollection('canvases', canvases, item => item.id);
  await importCollection('users', users, item => item.id);
  await importCollection(
    'pixels',
    pixels,
    item => `${item.canvasId}_${item.x}_${item.y}`, // Composite ID
  );
  await importCollection('pixelHistory', pixelHistory, () => ''); // Auto-generate ID

  console.log('🎉 All data imported successfully!');
}

importAll()
  .catch(console.error)
  .finally(() => admin.app().delete());
```

```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="backend/firestore-key.json"

# Run import
npx ts-node backend/scripts/import-to-firestore.ts
```

**Expected output:**
```
Importing 1 documents to canvases...
  ✓ Imported 1/1
✅ canvases import complete!
Importing 50 documents to users...
  ✓ Imported 50/50
✅ users import complete!
Importing 10000 documents to pixels...
  ✓ Imported 500/10000
  ✓ Imported 1000/10000
  ...
✅ pixels import complete!
```

---

### Phase 4: Application Code Update

#### 4.1 Update Dependencies

Already done in the migration:
- ✅ Removed `@prisma/client` and `prisma`
- ✅ Added `firebase-admin`
- ✅ Updated `package.json`

```bash
cd backend
npm install
```

---

#### 4.2 Update Database Service

Already done in the migration:
- ✅ Created `FirestoreService` to replace `PrismaService`
- ✅ Created `FirestoreModule` to replace `PrismaModule`
- ✅ Updated `app.module.ts` to import `FirestoreModule`

---

#### 4.3 Update Application Logic

**Example: Update pixel placement logic**

Before (Prisma):
```typescript
// pixels.service.ts (Prisma)
async placePixel(canvasId: string, x: number, y: number, color: number, userId: string) {
  return this.prisma.pixel.upsert({
    where: {
      canvasId_x_y: { canvasId, x, y },
    },
    update: { color, userId, updatedAt: new Date() },
    create: { canvasId, x, y, color, userId },
  });
}
```

After (Firestore):
```typescript
// pixels.service.ts (Firestore)
async placePixel(canvasId: string, x: number, y: number, color: number, userId: string) {
  const pixelId = FirestoreService.createPixelId(canvasId, x, y);
  const pixelRef = this.firestore.collection('pixels').doc(pixelId);

  await pixelRef.set({
    canvasId,
    x,
    y,
    color,
    userId,
    updatedAt: this.firestore.timestamp(),
  });

  return pixelRef.get().then(doc => doc.data());
}
```

---

### Phase 5: Testing

#### 5.1 Unit Tests

Update unit tests to work with Firestore:

```typescript
// pixels.service.spec.ts
import { Test } from '@nestjs/testing';
import { FirestoreService } from './firestore/firestore.service';

describe('PixelsService', () => {
  let service: PixelsService;
  let firestore: FirestoreService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PixelsService, FirestoreService],
    }).compile();

    service = module.get<PixelsService>(PixelsService);
    firestore = module.get<FirestoreService>(FirestoreService);
  });

  // Add tests...
});
```

---

#### 5.2 Integration Tests

Test Firestore operations:

```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Run tests
npm run test:e2e
```

---

### Phase 6: Deploy and Cutover

#### 6.1 Deploy Updated Application

```bash
# Build application
npm run build

# Deploy to Cloud Run/Functions
gcloud run deploy pixelhub-backend \
  --source . \
  --region europe-west1
```

---

#### 6.2 Verify Data

```bash
# Run verification script
./scripts/verify-firestore-connection.sh

# Check document counts
gcloud firestore documents list canvases --limit 1
gcloud firestore documents list users --limit 10
gcloud firestore documents list pixels --limit 100
```

---

### Phase 7: Decommission Cloud SQL

**Only after confirming Firestore is working correctly!**

```bash
# Remove Cloud SQL module from Terraform
cd terraform
# Comment out or remove cloud_sql module from main.tf

# Plan destruction
terraform plan

# Destroy Cloud SQL (WARNING: This deletes the database!)
terraform destroy -target=module.cloud_sql

# Confirm
```

**Keep Cloud SQL backup for 30 days before full decommission!**

---

## Data Transformation Reference

### Canvas

| PostgreSQL | Firestore |
|------------|-----------|
| `id: UUID` | `id: string` (document ID) |
| `width: int` | `width: number` |
| `height: int` | `height: number` |
| `version: int` | `version: number` |
| `createdAt: timestamp` | `createdAt: Timestamp` |
| `updatedAt: timestamp` | `updatedAt: Timestamp` |
| - | `totalPixels: number` (new) |

---

### Pixel

| PostgreSQL | Firestore |
|------------|-----------|
| Primary Key: `(canvasId, x, y)` | Document ID: `{canvasId}_{x}_{y}` |
| `canvasId: string` | `canvasId: string` |
| `x: int` | `x: number` |
| `y: int` | `y: number` |
| `color: int` | `color: number` |
| `userId: string` | `userId: string \| null` |
| `updatedAt: timestamp` | `updatedAt: Timestamp` |

---

### User

| PostgreSQL | Firestore |
|------------|-----------|
| `id: UUID` | `id: string` (document ID) |
| `username: string` | `username: string` |
| `lastPixelPlaced: timestamp?` | `lastPixelPlaced: Timestamp \| null` |
| `totalPixelsPlaced: int` | `totalPixelsPlaced: number` |
| `createdAt: timestamp` | `createdAt: Timestamp` |

---

### PixelHistory

| PostgreSQL | Firestore |
|------------|-----------|
| `id: BigInt` | `id: string` (auto-generated) |
| `canvasId: string` | `canvasId: string` |
| `x: int` | `x: number` |
| `y: int` | `y: number` |
| `color: int` | `color: number` |
| `userId: string?` | `userId: string \| null` |
| `createdAt: timestamp` | `createdAt: Timestamp` |

---

## Rollback Plan

If issues arise during migration:

### Immediate Rollback (< 1 hour)

```bash
# 1. Revert application code
git revert <commit-hash>
git push

# 2. Redeploy old version
cd backend
npm install  # Reinstall Prisma dependencies
npm run build
gcloud run deploy pixelhub-backend --source .

# 3. Restart Cloud SQL if stopped
gcloud sql instances patch INSTANCE_NAME --activation-policy=ALWAYS
```

---

### Delayed Rollback (< 24 hours)

```bash
# 1. Restore Cloud SQL from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=INSTANCE_NAME \
  --backup-instance=RESTORED_INSTANCE_NAME

# 2. Point application to restored instance
# Update DATABASE_URL in environment variables

# 3. Redeploy application
```

---

## Post-Migration Verification

### Checklist

- [ ] **All data migrated**: Verify document counts match
- [ ] **Indexes built**: Check index status
- [ ] **Application working**: Test all features
- [ ] **Performance acceptable**: Monitor latency and throughput
- [ ] **No errors**: Check logs for errors
- [ ] **Backups working**: Verify PITR is enabled
- [ ] **Costs acceptable**: Monitor billing
- [ ] **Cloud SQL decommissioned**: Remove old infrastructure (after 30 days)

---

### Verification Queries

```bash
# Count documents in each collection
gcloud firestore databases describe '(default)' | grep -i documents

# Sample data from each collection
gcloud firestore documents list canvases --limit 5
gcloud firestore documents list users --limit 5
gcloud firestore documents list pixels --limit 10

# Check for data integrity
# Write custom verification scripts to compare row counts, checksums, etc.
```

---

## Common Issues

### Issue: Document Count Mismatch

**Solution:** Re-run import for missing data

```bash
# Export missing data from PostgreSQL
# Transform and import incrementally
```

---

### Issue: Index Queries Failing

**Solution:** Wait for indexes to build or create manually

```bash
gcloud firestore indexes composite list
# Wait 5-10 minutes for indexes to complete
```

---

### Issue: High Costs After Migration

**Solution:** Optimize queries and implement caching

- Use pagination
- Implement client-side caching
- Reduce real-time listeners
- Archive old pixel history data

---

## Best Practices

1. **Test in staging first**: Never migrate production data directly
2. **Keep backups**: Maintain PostgreSQL backups for 30 days post-migration
3. **Monitor costs**: Set up billing alerts before migration
4. **Plan for rollback**: Always have a rollback plan
5. **Verify data**: Use checksums and counts to verify data integrity
6. **Gradual cutover**: Use feature flags to gradually switch to Firestore

---

## Additional Resources

- [Firestore Data Model Guide](./firestore-data-model.md)
- [Firestore Setup Guide](./firestore-setup.md)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Best Practices](https://cloud.google.com/firestore/docs/best-practices)

---

Migration complete! 🎉
