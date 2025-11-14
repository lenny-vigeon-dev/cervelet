# Firestore Setup Guide

This guide will walk you through setting up Google Cloud Firestore for the PixelHub collaborative pixel art application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

Firestore is a serverless, NoSQL document database that automatically scales to meet your application's needs. This project uses Firestore Native mode with the Firebase Admin SDK for backend operations.

**Key Features:**
- Automatic scaling (no instance management)
- Real-time synchronization capabilities
- Pay-per-usage pricing model
- Built-in security rules
- Automatic backups with Point-in-Time Recovery (PITR)

---

## Prerequisites

Before you begin, ensure you have:

1. **GCP Account**: Active Google Cloud Platform account
2. **GCP Project**: A GCP project created (`serverless-tek89`)
3. **Terraform**: Version 1.0 or higher installed
4. **gcloud CLI**: Google Cloud SDK installed and configured
5. **Node.js**: Version 18+ for running the backend application
6. **Git**: For version control

### Install Required Tools

```bash
# Install Terraform (macOS)
brew install terraform

# Install gcloud CLI (macOS)
brew install --cask google-cloud-sdk

# Install Node.js (macOS)
brew install node

# Verify installations
terraform --version
gcloud --version
node --version
pnpm --version
```

---

## Quick Start

For experienced users, here's the TL;DR:

```bash
# 1. Authenticate with GCP
gcloud auth application-default login

# 2. Deploy Firestore database
./scripts/deploy-db.sh

# 3. Set up service account credentials
./scripts/setup-firestore-credentials.sh

# 4. Configure environment variables
cd backend
cp .env.example .env
# Edit .env with your configuration

# 5. Install dependencies
pnpm install

# 6. Start the application
pnpm run start:dev

# 7. Verify connection
cd ..
./scripts/verify-firestore-connection.sh
```

---

## Detailed Setup

### Step 1: GCP Authentication

Authenticate with Google Cloud to allow Terraform and the application to access GCP resources.

```bash
# Login to gcloud
gcloud auth login

# Set your project
gcloud config set project serverless-tek89

# Create Application Default Credentials (ADC)
gcloud auth application-default login
```

**What this does:**
- `gcloud auth login`: Authenticates your user account
- `gcloud config set project`: Sets the default project
- `gcloud auth application-default login`: Creates credentials for local application development

---

### Step 2: Deploy Firestore Database

Use Terraform to provision the Firestore database and required infrastructure.

```bash
# Run the deployment script
./scripts/deploy-db.sh
```

**What happens:**
1. Enables required GCP APIs (Firestore, App Engine)
2. Initializes Terraform
3. Plans infrastructure changes
4. Prompts for confirmation
5. Creates Firestore database with:
   - Native mode configuration
   - Optimized indexes for pixel operations
   - Service account for application access
   - Point-in-Time Recovery (PITR) enabled

**Expected output:**
```
✅ Firestore database deployed successfully!

📊 Database Information:
firestore_database_name = "(default)"
firestore_database_location = "europe-west1"
firestore_project_id = "serverless-tek89"

🔑 Service Account Created:
firestore_service_account_email = "pixelhub-firestore-sa@serverless-tek89.iam.gserviceaccount.com"
```

**Note**: Deployment takes ~2-5 minutes. Indexes may take additional time to build.

---

### Step 3: Set Up Service Account Credentials

For local development, you need a service account key to authenticate with Firestore.

```bash
# Run the credentials setup script
./scripts/setup-firestore-credentials.sh
```

**What this does:**
1. Retrieves the service account email from Terraform
2. Creates a new service account key
3. Saves the key to `backend/firestore-key.json`
4. Provides instructions for using the key

**Security Notes:**
- The key file is automatically added to `.gitignore`
- **NEVER** commit this file to version control
- For production, use Workload Identity or Application Default Credentials

---

### Step 4: Configure Environment Variables

Set up your application's environment configuration.

```bash
cd backend

# Copy the example environment file
cp .env.example .env

# Edit the .env file
nano .env  # or use your preferred editor
```

**Required configuration:**

```bash
# .env file
NODE_ENV="development"
PORT="3000"
GCP_PROJECT_ID="serverless-tek89"

# Path to your service account key
GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/backend/firestore-key.json"
```

**Important:**
- Use absolute paths for `GOOGLE_APPLICATION_CREDENTIALS`
- The path should point to the key file created in Step 3

---

### Step 5: Install Dependencies

Install the backend application dependencies.

```bash
# Make sure you're in the backend directory
cd backend

# Install dependencies
pnpm install
```

**What this installs:**
- Firebase Admin SDK (`firebase-admin`)
- NestJS framework dependencies
- Other application dependencies

---

### Step 6: Start the Application

Start the NestJS application in development mode.

```bash
# Start in development mode (with hot reload)
pnpm run start:dev

# Alternative: Start in production mode
pnpm run build
pnpm run start:prod
```

**Expected output:**
```
Firestore connection initialized
[Nest] Application successfully started
```

If you see "Firestore connection initialized", your setup is working correctly!

---

### Step 7: Verify Connection

Verify that Firestore is properly configured and accessible.

```bash
# From the project root
./scripts/verify-firestore-connection.sh
```

**What this checks:**
1. Firestore database status
2. Index build status
3. Service account permissions
4. Database configuration

---

### Step 8: Initialize Collections (Optional)

Firestore collections are created automatically when you write the first document. However, you may want to create initial data for testing.

**Important**: In Firestore, collections don't need to be explicitly created - they are created implicitly when you add the first document.

#### Option 1: Using Application Code

The best practice is to let your application create documents as needed:

```typescript
// Example: Create initial canvas via your NestJS application
import { FirestoreService } from './firestore/firestore.service';

async function initializeCanvas() {
  const firestore = new FirestoreService();

  // Create main canvas
  await firestore.doc('canvases', 'main-canvas').set({
    id: 'main-canvas',
    width: 1000,
    height: 1000,
    version: 1,
    createdAt: firestore.timestamp(),
    updatedAt: firestore.timestamp(),
    totalPixels: 0,
  });

  console.log('Canvas initialized!');
}
```

#### Option 2: Using gcloud CLI

Create documents directly via gcloud:

```bash
# Create a canvas document
gcloud firestore documents create canvases/main-canvas \
  --project=serverless-tek89 \
  --data='{"id":"main-canvas","width":1000,"height":1000,"version":1,"totalPixels":0}'

# Verify collection was created
gcloud firestore documents list canvases --project=serverless-tek89
```

#### Option 3: Using Firebase Console

1. Go to [Firestore Console](https://console.cloud.google.com/firestore)
2. Click "Start collection"
3. Enter collection ID: `canvases`
4. Add first document with fields:
   - `id`: string → `main-canvas`
   - `width`: number → `1000`
   - `height`: number → `1000`
   - `version`: number → `1`
   - `totalPixels`: number → `0`
   - `createdAt`: timestamp → (auto)
   - `updatedAt`: timestamp → (auto)

**Required Collections:**
- `canvases` - Canvas configuration (create first)
- `pixels` - Individual pixels (created automatically when users place pixels)
- `users` - User accounts (created automatically on first login)
- `pixelHistory` - Audit trail (created automatically when pixels change)

**Note**: Only `canvases` needs initial setup. Other collections will be populated automatically by your application.

---

## Local Development

### Using Application Default Credentials (ADC)

Instead of using a service account key file, you can use ADC for local development:

```bash
# Authenticate with your user account
gcloud auth application-default login

# Remove GOOGLE_APPLICATION_CREDENTIALS from .env
# The Firebase Admin SDK will automatically use ADC
```

**Pros:**
- No key files to manage
- Automatic credential refresh
- Uses your personal GCP permissions

**Cons:**
- Requires re-authentication after ~1 hour
- May have different permissions than service account

---

### Using Firestore Emulator

For offline development and testing, use the Firestore Emulator:

```bash
# Install Firebase CLI (if not already installed)
pnpm install -g firebase-tools

# Start the emulator
./scripts/setup-firestore-emulator.sh
```

**Update your .env for emulator:**

```bash
# .env for emulator mode
NODE_ENV="development"
PORT="3000"
GCP_PROJECT_ID="demo-project"
FIRESTORE_EMULATOR_HOST="localhost:8080"
```

**Benefits:**
- No GCP costs
- Faster development
- Offline capability
- Reset data easily

---

## Production Deployment

### Cloud Run (recommended)

For production deployment on Cloud Run, use **Application Default Credentials (ADC)**.  
Cloud Run automatically injects credentials for its service account, so:

- ❌ Do **NOT** deploy `firestore-key.json`
- ❌ Do **NOT** set `GOOGLE_APPLICATION_CREDENTIALS` in production
- ✅ Let the Cloud Run **service account** authenticate to Firestore

---

### 1. Grant Firestore permissions to the Cloud Run service account

By default, Cloud Run uses the Compute Engine default service account:

```bash
PROJECT_ID="serverless-tek89"
PROJECT_NUMBER="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Firestore (Datastore) user permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.user"
```

---

## Database Operations

### Viewing Data

**Option 1: GCP Console**
1. Go to [GCP Console](https://console.cloud.google.com/firestore)
2. Navigate to Firestore → Data
3. Browse collections and documents

**Option 2: Firebase Console** (requires Firebase project)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database

---

### Backing Up Data

Firestore automatically creates daily backups with PITR enabled.

**Manual Export:**

```bash
# Export all data
gcloud firestore export gs://your-backup-bucket/firestore-backup

# Export specific collections
gcloud firestore export gs://your-backup-bucket/firestore-backup \
  --collection-ids='canvases,pixels,users'
```

**Restore from Backup:**

```bash
# Import from backup
gcloud firestore import gs://your-backup-bucket/firestore-backup
```

---

### Monitoring and Logging

**View Firestore metrics:**

```bash
# Open Cloud Console monitoring
gcloud monitoring dashboards list
```

**View application logs:**

```bash
# View logs (if deployed on Cloud Run)
gcloud run services logs read YOUR_SERVICE_NAME --limit 50
```

**Set up alerts:**
1. Go to Cloud Console → Monitoring → Alerting
2. Create alerts for:
   - High read/write rates
   - Error rates
   - Storage thresholds

---

## Troubleshooting

### Issue: "Permission Denied" Error

**Symptoms:**
```
Error: Permission denied on resource project serverless-tek89
```

**Solutions:**
1. Check authentication:
   ```bash
   gcloud auth list
   gcloud auth application-default login
   ```

2. Verify service account permissions:
   ```bash
   ./scripts/verify-firestore-connection.sh
   ```

3. Ensure service account has `datastore.user` role

---

### Issue: "Database Already Exists"

**Symptoms:**
```
Error: Firestore database already exists
```

**Explanation:**
Only one Firestore database (in Native mode) can exist per GCP project.

**Solutions:**
1. If migrating from Cloud SQL, the database is already created
2. Use the existing database (no action needed)
3. To recreate:
   ```bash
   # Disable deletion protection in Terraform
   # Set deletion_protection = false
   terraform apply
   terraform destroy
   ```

**Warning:** Destroying the database will delete all data!

---

### Issue: Indexes Not Building

**Symptoms:**
```
Error: The query requires an index
```

**Solution:**
1. Check index status:
   ```bash
   gcloud firestore indexes composite list
   ```

2. Indexes take 5-10 minutes to build after deployment

3. Manually create missing indexes:
   ```bash
   gcloud firestore indexes composite create \
     --collection-group=pixels \
     --field-config field-path=canvasId,order=ascending \
     --field-config field-path=updatedAt,order=descending
   ```

---

### Issue: Application Can't Connect

**Symptoms:**
```
Error: Could not load the default credentials
```

**Solutions:**
1. **Check environment variables:**
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   echo $GCP_PROJECT_ID
   ```

2. **Verify key file exists:**
   ```bash
   ls -la backend/firestore-key.json
   ```

3. **Re-authenticate:**
   ```bash
   gcloud auth application-default login
   ```

4. **Check .env file:**
   - Ensure `GOOGLE_APPLICATION_CREDENTIALS` uses absolute path
   - Ensure `GCP_PROJECT_ID` is set correctly

---

### Issue: High Costs

**Symptoms:**
Unexpected high charges on GCP billing

**Solutions:**
1. **Check usage:**
   ```bash
   # View Firestore usage
   gcloud firestore operations list
   ```

2. **Optimize queries:**
   - Use pagination for large result sets
   - Implement caching
   - Avoid real-time listeners on large collections

3. **Set budget alerts:**
   - Go to Cloud Console → Billing → Budgets & alerts
   - Set up cost alerts

4. **Review data model:**
   - Consider denormalization to reduce reads
   - Archive old pixel history data

---

## Security Best Practices

### 1. Service Account Key Management

- **Never** commit keys to version control
- Use Secret Manager for production keys
- Rotate keys regularly (every 90 days)
- Use ADC in production instead of keys

### 2. Firestore Security Rules

Production-ready security rules are defined in `firestore.rules` at the project root. The rules implement:

**Security Features:**
- ✅ Public read access for canvases, pixels, and user profiles (collaborative viewing)
- ✅ Authentication required for pixel placement
- ✅ User ownership validation (users can only write their own pixels)
- ✅ Admin role for canvas management
- ✅ Data validation (coordinates, colors, required fields)
- ✅ Privilege escalation prevention (users cannot change their own role)
- ✅ Append-only pixel history (audit trail integrity)

**Key Rules by Collection:**

**`canvases`**:
- Read: Public
- Write: Admins only

**`pixels`**:
- Read: Public (anyone can view the canvas)
- Create: Authenticated users, must own the pixel (`userId == auth.uid`)
- Update: Authenticated users, cannot change pixel ownership
- Delete: Admins only

**`users`**:
- Read: Public (leaderboards, user info)
- Create: Users can create their own profile on first login
- Update: Users can only update their own profile, cannot change role
- Delete: Admins only

**`pixelHistory`**:
- Read: Public (canvas replay feature)
- Create: Authenticated users (append-only)
- Update/Delete: Forbidden (preserves audit trail)

**Deploy Security Rules:**
```bash
# Test rules locally with emulator first
firebase emulators:start --only firestore

# Deploy to production
firebase deploy --only firestore:rules

# Verify rules are active
firebase firestore:rules:list
```

**Testing Security Rules:**
```javascript
// Example: Test in Firestore Rules Playground
// https://console.cloud.google.com/firestore/rules

// Should SUCCEED: Authenticated user placing pixel
{
  "auth": {"uid": "user123"},
  "operation": "create",
  "path": "/pixels/main-canvas_10_20",
  "data": {
    "canvasId": "main-canvas",
    "x": 10,
    "y": 20,
    "color": 255,
    "userId": "user123",
    "updatedAt": "2025-11-14T10:00:00Z"
  }
}

// Should FAIL: User trying to place pixel with different userId
{
  "auth": {"uid": "user123"},
  "operation": "create",
  "data": {"userId": "different-user"}  // Validation error!
}
```

See `firestore.rules` in the project root for complete implementation.

### 3. Network Security

- Use VPC Service Controls for additional isolation
- Enable Private Google Access for Cloud Run
- Use Identity-Aware Proxy (IAP) for admin access

---

## Performance Optimization

### 1. Indexing Strategy

All required indexes are created by Terraform, but you can add custom indexes:

```bash
# Create a custom index
gcloud firestore indexes composite create \
  --collection-group=pixels \
  --field-config field-path=color,order=ascending \
  --field-config field-path=updatedAt,order=descending
```

### 2. Caching

Implement caching to reduce read operations:

```typescript
// Example: Cache canvas data
const cache = new Map();

async function getCanvas(canvasId: string) {
  if (cache.has(canvasId)) {
    return cache.get(canvasId);
  }

  const canvas = await firestore.collection('canvases').doc(canvasId).get();
  cache.set(canvasId, canvas.data());
  return canvas.data();
}
```

### 3. Batch Operations

Use batch writes for multiple operations:

```typescript
const batch = firestore.batch();

pixels.forEach(pixel => {
  const ref = firestore.collection('pixels').doc(pixelId);
  batch.set(ref, pixel);
});

await batch.commit(); // Single network call
```

---

## Database Schema and Types

### TypeScript Types

All Firestore document types are defined in `backend/src/types/firestore.types.ts`:

```typescript
import { Canvas, Pixel, User, PixelHistory, COLLECTIONS } from './types';

// Use strongly-typed interfaces
const canvas: Canvas = {
  id: 'main-canvas',
  width: 1000,
  height: 1000,
  version: 1,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  totalPixels: 0,
};
```

### Firestore Indexes

Composite indexes are defined in `backend/firestore.indexes.json` and can be deployed using:

```bash
# Deploy indexes
./scripts/deploy-firestore-indexes.sh

# Or manually via Firebase Console
# https://console.firebase.google.com/project/serverless-tek89/firestore/indexes
```

**Required indexes:**
- `pixels`: `(canvasId, updatedAt DESC)`, `(userId, updatedAt DESC)`
- `pixelHistory`: `(canvasId, createdAt DESC)`, `(canvasId, x, y, createdAt DESC)`
- `users`: `username` (single field)

---

## Additional Resources

- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Terraform Firestore Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database)
- [Firestore Best Practices](https://cloud.google.com/firestore/docs/best-practices)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

---

## Support

For issues or questions:
1. Check this documentation and troubleshooting section
2. Review the [Firestore documentation](https://cloud.google.com/firestore/docs)
3. Check application logs: `pnpm run start:dev`
4. Verify Firestore connection: `./scripts/verify-firestore-connection.sh`
5. Open an issue in the project repository

---

## Next Steps

After completing the setup:

1. **Explore the data model**: See `firestore-data-model.md`
2. **Implement features**: Start building pixel placement, user management, etc.
3. **Set up monitoring**: Configure Cloud Monitoring and alerting
4. **Deploy to production**: Follow production deployment guide
5. **Optimize performance**: Implement caching and query optimization

Happy coding! 🎨
