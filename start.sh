#!/bin/bash

echo "🚀 Starting ROS Web Bridge Frontend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the web_frontend directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Run setup check first
echo "🔍 Running quick setup check..."
./check-setup.sh

echo ""
echo "✅ Starting development server..."
echo "🌐 Open browser to: http://localhost:5173"
echo "📌 Press Ctrl+C to stop the server"
echo ""

# Start the dev server
pnpm dev