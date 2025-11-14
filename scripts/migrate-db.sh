#!/bin/bash
set -e

# Run Prisma migrations against Cloud SQL database

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

echo "🔄 Running Prisma migrations..."

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "❌ .env file not found in backend directory"
    echo "📝 Please create backend/.env with DATABASE_URL"
    echo "   DATABASE_URL=\"postgresql://pixelhub_user:YOUR_PASSWORD@127.0.0.1:5432/pixelhub\""
    exit 1
fi

# Check if Cloud SQL Proxy is running
if ! pgrep -f "cloud-sql-proxy" > /dev/null; then
    echo "⚠️  Cloud SQL Proxy is not running"
    echo "🔌 Start it first: ./scripts/setup-db-proxy.sh"
    read -p "   Do you want to continue anyway? (yes/no): " continue
    if [ "$continue" != "yes" ]; then
        exit 0
    fi
fi

cd "$BACKEND_DIR"

# Check if Prisma is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found! Please install it first."
    exit 1
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
pnpm prisma generate

# Run migrations
echo "📊 Applying migrations..."
if [ "$1" = "dev" ]; then
    echo "🛠️  Running development migrations (creates migration files)..."
    pnpm prisma migrate dev
else
    echo "🚀 Running production migrations (applies existing migrations)..."
    pnpm prisma migrate deploy
fi

echo ""
echo "✅ Migrations completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   - View database: pnpm prisma studio"
echo "   - Create seed data: create scripts/seed-db.sh"
