#!/bin/bash
set -e

# Setup and start Firestore emulator for local development
# NOTE: This emulator is for LOCAL TESTING ONLY
# Production Firestore database is managed by Terraform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "🔥 Setting up Firestore Emulator..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found"
    echo "📦 Installing Firebase CLI..."
    pnpm add -g firebase-tools
fi

echo "✅ Firebase CLI installed"
echo "📋 Firebase version: $(firebase --version)"

# Navigate to project root
cd "$PROJECT_ROOT"

# Check firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found!"
    echo "⚠️  Please run 'firebase init firestore' first to set up Firebase configuration"
    echo "⚠️  Note: Production database is managed by Terraform - Firebase is for emulator/rules only"
    exit 1
else
    echo "✅ firebase.json found"
fi

echo ""
echo "🚀 Starting Firestore Emulator..."
echo "📝 Emulator UI: http://localhost:4000"
echo "📝 Firestore endpoint: localhost:8080"
echo "📝 Press Ctrl+C to stop the emulator"
echo ""
echo "⚠️  To connect your app to the emulator, set in .env:"
echo "   FIRESTORE_EMULATOR_HOST=localhost:8080"
echo ""

# Start the emulator
firebase emulators:start --only firestore
