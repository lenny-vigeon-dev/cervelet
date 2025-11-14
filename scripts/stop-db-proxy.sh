#!/bin/bash
set -e

# Stop Cloud SQL Proxy

echo "🛑 Stopping Cloud SQL Proxy..."

# Find and kill all cloud-sql-proxy processes
if pgrep -f "cloud-sql-proxy" > /dev/null; then
    PIDS=$(pgrep -f "cloud-sql-proxy")
    echo "📍 Found proxy processes: $PIDS"

    for PID in $PIDS; do
        echo "   Stopping PID $PID..."
        kill $PID
    done

    sleep 2

    # Verify it's stopped
    if ! pgrep -f "cloud-sql-proxy" > /dev/null; then
        echo "✅ Cloud SQL Proxy stopped successfully"
    else
        echo "⚠️  Some processes may still be running. Force kill with:"
        echo "   pkill -9 -f cloud-sql-proxy"
    fi
else
    echo "ℹ️  Cloud SQL Proxy is not running"
fi
