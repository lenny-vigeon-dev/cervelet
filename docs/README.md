# PixelHub Documentation

Welcome to the PixelHub documentation! This directory contains all project documentation organized by topic.

## Documentation Index

### Database
- **[Database Overview](database/README.md)** - Complete database documentation index
- **[Quick Start Guide](database/quickstart.md)** - Quick reference for daily database operations
- **[Setup Guide](database/firestore-setup.md)** - Complete guide for setting up Firestore
- **[Data Model](database/firestore-data-model.md)** - Firestore schema and collections documentation

### Authentication
- **[OAuth Authentication](oauth-authentication.md)** - Discord OAuth2 flow, API contracts, security
- **[Firebase Auth + Discord Setup](firebase-auth-discord-setup.md)** - Firebase Custom Tokens via Discord, deployment steps

### Infrastructure & Deployment
- **[cf-proxy Deployment](deploy_cf_proxy.md)** - Cloud Run deployment guide for the backend proxy
- **[Cloud Storage Setup](cloud-storage-setup.md)** - Snapshot bucket deployment, testing, cost analysis
- **[Cloud Storage Implementation](cloud-storage-implementation.md)** - Optimization details, configuration, monitoring
- **[DNS Setup Guide](DNS-SETUP-GUIDE.md)** - Custom domain (pixelhub.now) configuration
- **[Firebase & Terraform](firebase-terraform.md)** - Firebase CLI vs Terraform coordination workflow

### Frontend
- **[Real-time Canvas Setup](realtime-canvas-setup.md)** - Hybrid snapshot + Firestore listener architecture
- **[Frontend Pixel Writing](frontend-pixel-writing.md)** - Pixel write flow, rate limiting, color format

### Architecture
- **[Infrastructure Diagram](infrastructure_diagram.jpg)** - Visual architecture diagram (GCP services, data flow)

### Application READMEs
- **[Backend README](../backend/README.md)** - Backend application documentation
- **[Frontend README](../frontend/README.md)** - Frontend application documentation

## Getting Started

New to the project? Start here:

1. Read the main [README](../README.md) for project overview
2. Follow the [Firestore Setup Guide](database/firestore-setup.md) to set up your database
3. Use the [Database Quick Start](database/quickstart.md) for daily development
4. Check [OAuth Authentication](oauth-authentication.md) for auth setup
5. See the [cf-proxy Deployment](deploy_cf_proxy.md) guide for backend deployment
6. Review the [Cloud Storage Setup](cloud-storage-setup.md) for snapshot infrastructure

## Documentation Structure

```
docs/
├── README.md                          # This file (documentation index)
├── infrastructure_diagram.jpg         # Architecture diagram (GCP services, data flow)
├── database/
│   ├── README.md                     # Database documentation index
│   ├── quickstart.md                 # Quick reference for database operations
│   ├── firestore-setup.md            # Complete Firestore setup guide
│   └── firestore-data-model.md       # Firestore schema and collections
├── oauth-authentication.md           # Discord OAuth2 flow and setup
├── firebase-auth-discord-setup.md    # Firebase Custom Token bridge
├── deploy_cf_proxy.md               # cf-proxy Cloud Run deployment
├── cloud-storage-setup.md           # Cloud Storage bucket + snapshot deployment
├── cloud-storage-implementation.md   # Snapshot optimization details
├── DNS-SETUP-GUIDE.md               # Custom domain configuration
├── firebase-terraform.md            # Firebase CLI / Terraform coordination
├── realtime-canvas-setup.md         # Real-time canvas architecture
└── frontend-pixel-writing.md        # Frontend pixel write implementation
```

## Contributing to Documentation

When adding new documentation:
- Place general docs in `docs/`
- Group related docs in subdirectories (e.g., `database/`, `api/`)
- Update this index when adding new docs
- Use clear, descriptive filenames in kebab-case
- Include a table of contents for long documents

## External Resources

- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [r/place Technical Discussion](https://www.reddit.com/r/redditdev/comments/txqr7y/rplace_architecture/)
