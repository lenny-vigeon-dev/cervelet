#!/bin/bash
set -e

# Set up and start Cloud SQL Proxy for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

echo "🔌 Setting up Cloud SQL Proxy..."

# Check if Cloud SQL Proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ Cloud SQL Proxy not found!"
    echo ""
    echo "📦 Install it with:"
    echo "   macOS: brew install cloud-sql-proxy"
    echo "   Linux: curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64"
    echo "   Windows: curl -o cloud-sql-proxy.exe https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.x64.exe"
    exit 1
fi

# Get connection name from Terraform
cd "$TERRAFORM_DIR"
CONNECTION_NAME=$(terraform output -raw database_connection_name 2>/dev/null)

if [ -z "$CONNECTION_NAME" ]; then
    echo "❌ Could not get database connection name from Terraform"
    echo "📝 Make sure you've deployed the database first: ./scripts/deploy-db.sh"
    exit 1
fi

echo "📡 Connection name: $CONNECTION_NAME"

# Check if proxy is already running
if pgrep -f "cloud-sql-proxy.*$CONNECTION_NAME" > /dev/null; then
    echo "⚠️  Cloud SQL Proxy is already running"
    PID=$(pgrep -f "cloud-sql-proxy.*$CONNECTION_NAME")
    echo "   PID: $PID"
    read -p "   Do you want to restart it? (yes/no): " restart
    if [ "$restart" = "yes" ]; then
        echo "🔄 Stopping existing proxy..."
        pkill -f "cloud-sql-proxy.*$CONNECTION_NAME"
        sleep 2
    else
        echo "✅ Using existing proxy"
        exit 0
    fi
fi

# Start the proxy
echo "🚀 Starting Cloud SQL Proxy on port 5432..."
cloud-sql-proxy "$CONNECTION_NAME" --port 5432 &
PROXY_PID=$!

# Wait a moment for it to start
sleep 3

# Check if it's running
if ps -p $PROXY_PID > /dev/null; then
    echo "✅ Cloud SQL Proxy started successfully (PID: $PROXY_PID)"
    echo ""
    echo "📝 Connection details:"
    echo "   Host: 127.0.0.1"
    echo "   Port: 5432"
    echo "   Database: pixelhub"
    echo "   User: pixelhub_user"
    echo ""
    echo "💡 Update your backend/.env file:"
    echo "   DATABASE_URL=\"postgresql://pixelhub_user:YOUR_PASSWORD@127.0.0.1:5432/pixelhub\""
    echo ""
    echo "🛑 To stop the proxy: kill $PROXY_PID"
else
    echo "❌ Failed to start Cloud SQL Proxy"
    exit 1
fi
