# Firebase CLI vs Terraform: Avoiding Conflicts

This document explains how Firebase CLI and Terraform work together without conflicts.

## Overview

**Terraform** manages production infrastructure:
- ✅ Firestore database creation
- ✅ Composite indexes
- ✅ Service accounts and IAM
- ✅ Infrastructure as code

**Firebase CLI** provides:
- ✅ Local Firestore emulator
- ✅ Security rules deployment
- ✅ Index visualization
- ⚠️  Can deploy indexes (but shouldn't - use Terraform instead)

## File Responsibilities

| File | Managed By | Purpose |
|------|-----------|---------|
| `infrastructure/terraform/modules/firestore/main.tf` | **Terraform** | Production database & indexes |
| `firebase.json` | **Git tracked** | Emulator config + project reference |
| `firestore.rules` | **Git tracked** | Security rules (for emulator & production) |
| `firestore.indexes.json` | **Git tracked** | Index definitions (synced from Terraform) |

## Important Rules

### ✅ DO:
- Use **Terraform** to deploy production database and indexes
- Use **Firebase CLI** for local emulator during development
- Keep `firestore.indexes.json` in sync with Terraform resources
- Deploy security rules via `firebase deploy --only firestore:rules`

### ❌ DON'T:
- Deploy indexes via `firebase deploy --only firestore:indexes` (use Terraform)
- Modify production database directly in Firebase Console
- Run `firebase init` again (files already configured)

## Workflow

### 1. Production Database Changes

```bash
# 1. Update Terraform files
vim infrastructure/terraform/modules/firestore/main.tf

# 2. Deploy via Terraform
cd infrastructure/terraform
terraform plan
terraform apply

# 3. Sync indexes to firestore.indexes.json (optional)
cd ../..
gcloud firestore indexes composite list --format=json > firestore.indexes.json
```

### 2. Security Rules Changes

```bash
# 1. Update firestore.rules file
vim firestore.rules

# 2. Deploy to production
firebase deploy --only firestore:rules
```

### 3. Local Development

```bash
# Start emulator (uses firebase.json config)
./scripts/setup-firestore-emulator.sh

# In your app .env, set:
FIRESTORE_EMULATOR_HOST=localhost:8080
```

## Why Keep firestore.indexes.json?

Even though Terraform manages production indexes, keeping `firestore.indexes.json` is useful:

1. **Emulator**: Local emulator uses these indexes
2. **Documentation**: Developers can see what indexes exist
3. **Validation**: Can compare with Terraform to ensure they match
4. **Migration**: Easy to port indexes if needed

## Troubleshooting

### Indexes Out of Sync

If `firestore.indexes.json` doesn't match Terraform:

```bash
# Pull current indexes from production
cd infrastructure/terraform
terraform output

# Update firestore.indexes.json manually to match
# Or regenerate from production:
cd ../..
gcloud firestore indexes composite list --format=json > firestore.indexes.json
```

### Accidentally Deployed Indexes via Firebase

If you accidentally ran `firebase deploy --only firestore:indexes`:

```bash
# Re-apply Terraform to ensure state matches
cd infrastructure/terraform
terraform apply
```

## Summary

- **Production Infrastructure** → Terraform (`terraform apply`)
- **Security Rules** → Firebase CLI (`firebase deploy --only firestore:rules`)
- **Local Testing** → Firebase Emulator (`./scripts/setup-firestore-emulator.sh`)
- **Indexes** → Defined in Terraform, synced to `firestore.indexes.json` for reference

This separation ensures infrastructure is version-controlled and reproducible while still allowing local development with the emulator.
