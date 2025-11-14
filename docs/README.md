# PixelHub Documentation

Welcome to the PixelHub documentation! This directory contains all project documentation organized by topic.

## 📚 Documentation Index

### Database
- **[Quick Start Guide](database/quickstart.md)** - Quick reference for daily database operations
- **[Deployment Guide](database/deployment.md)** - Complete guide for deploying PostgreSQL with Cloud SQL
- **[Module Documentation](../terraform/modules/cloud-sql/README.md)** - Terraform Cloud SQL module details

### Authentication
- **[OAuth Authentication](oauth-authentication.md)** - OAuth setup and configuration

### Application
- **[Backend README](../backend/README.md)** - Backend application documentation
- **[Frontend README](../frontend/README.md)** - Frontend application documentation

## 🚀 Getting Started

New to the project? Start here:

1. Read the main [README](../README.md) for project overview
2. Follow the [Database Deployment Guide](database/deployment.md) to set up your database
3. Use the [Database Quick Start](database/quickstart.md) for daily development
4. Check [OAuth Authentication](oauth-authentication.md) for auth setup

## 📁 Documentation Structure

```
docs/
├── README.md                          # This file
├── database/
│   ├── quickstart.md                 # Quick reference for database operations
│   └── deployment.md                 # Full database deployment guide
└── oauth-authentication.md           # OAuth setup guide

terraform/modules/cloud-sql/
└── README.md                         # Cloud SQL module documentation
```

## 💡 Contributing to Documentation

When adding new documentation:
- Place general docs in `docs/`
- Group related docs in subdirectories (e.g., `database/`, `api/`)
- Update this index when adding new docs
- Use clear, descriptive filenames in kebab-case
- Include a table of contents for long documents

## 🔗 External Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Google Cloud SQL](https://cloud.google.com/sql/docs)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [r/place Technical Discussion](https://www.reddit.com/r/redditdev/comments/txqr7y/rplace_architecture/)
