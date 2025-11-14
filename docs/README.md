# PixelHub Documentation

Welcome to the PixelHub documentation! This directory contains all project documentation organized by topic.

## 📚 Documentation Index

### Database
- **[Quick Start Guide](database/quickstart.md)** - Quick reference for daily database operations
- **[Setup Guide](database/firestore-setup.md)** - Complete guide for setting up Firestore
- **[Data Model](database/firestore-data-model.md)** - Firestore schema and collections documentation
- **[Database Overview](database/README.md)** - Complete database documentation index

### Authentication
- **[OAuth Authentication](oauth-authentication.md)** - OAuth setup and configuration

### Application
- **[Backend README](../backend/README.md)** - Backend application documentation
- **[Frontend README](../frontend/README.md)** - Frontend application documentation

## 🚀 Getting Started

New to the project? Start here:

1. Read the main [README](../README.md) for project overview
2. Follow the [Firestore Setup Guide](database/firestore-setup.md) to set up your database
3. Use the [Database Quick Start](database/quickstart.md) for daily development
4. Check [OAuth Authentication](oauth-authentication.md) for auth setup

## 📁 Documentation Structure

```
docs/
├── README.md                          # This file
├── database/
│   ├── README.md                     # Database documentation index
│   ├── quickstart.md                 # Quick reference for database operations
│   ├── firestore-setup.md            # Complete Firestore setup guide
│   └── firestore-data-model.md       # Firestore schema and collections
└── oauth-authentication.md           # OAuth setup guide

terraform/modules/firestore/
└── README.md                         # Firestore module documentation
```

## 💡 Contributing to Documentation

When adding new documentation:
- Place general docs in `docs/`
- Group related docs in subdirectories (e.g., `database/`, `api/`)
- Update this index when adding new docs
- Use clear, descriptive filenames in kebab-case
- Include a table of contents for long documents

## 🔗 External Resources

- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [r/place Technical Discussion](https://www.reddit.com/r/redditdev/comments/txqr7y/rplace_architecture/)
