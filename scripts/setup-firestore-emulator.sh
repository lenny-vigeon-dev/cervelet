#!/bin/bash
set -e

# Setup and start Firestore emulator for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "🔥 Setting up Firestore Emulator..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found"
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI installed"
echo "📋 Firebase version: $(firebase --version)"

# Navigate to project root
cd "$PROJECT_ROOT"

# Initialize Firebase (if not already initialized)
if [ ! -f "firebase.json" ]; then
    echo "🔧 Initializing Firebase project..."
    echo "📝 Please select 'Firestore' when prompted"
    firebase init firestore
else
    echo "✅ Firebase already initialized"
fi

echo ""
echo "🚀 Starting Firestore Emulator..."
echo "📝 Press Ctrl+C to stop the emulator"
echo ""

# Start the emulator
firebase emulators:start --only firestore
