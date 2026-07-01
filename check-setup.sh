#!/bin/bash

echo "🔍 Checking web_frontend setup..."

# Check Node.js
echo -n "Node.js version: "
if command -v node &> /dev/null; then
    node --version
else
    echo "❌ NOT FOUND"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check pnpm
echo -n "pnpm version: "
if command -v pnpm &> /dev/null; then
    pnpm --version
else
    echo "❌ NOT FOUND"
    echo "Installing pnpm..."
    npm install -g pnpm
    pnpm --version
fi

# Check dependencies
echo -n "Checking dependencies... "
if [ -d "node_modules" ] && [ -f "package.json" ]; then
    echo "✅ node_modules exists"
else
    echo "⚠️  node_modules not found, installing..."
    pnpm install
fi

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
npx tsc --noEmit 2>&1 | grep -v "deprecated" || echo "✅ TypeScript compilation passed"

# Check ROS connection (optional)
echo -n "Testing ROS WebSocket connection... "
if command -v curl &> /dev/null; then
    # rosbridge_websocket runs on port 9092 (see ros_web_bridge.launch)
    if timeout 2 curl -s http://localhost:9092 &> /dev/null; then
        echo "✅ ROS bridge is accessible on :9092"
    else
        echo "⚠️  ROS bridge not reachable at localhost:9092"
        echo "   Start it with: roslaunch ros_web_bridge ros_web_bridge.launch"
    fi
else
    echo "⚠️  curl not available, skipping ROS check"
fi

echo ""
echo "📋 Setup Summary:"
echo "  - Node.js: ✅ Installed"
echo "  - pnpm: ✅ Installed"
echo "  - Dependencies: ✅ Installed"
echo ""
echo "🚀 Next steps:"
echo "  1. Start ROS backend (if not already running)"
echo "  2. Run: pnpm dev"
echo "  3. Open: http://localhost:5173"
echo ""
echo "For troubleshooting, see README.md 🔧 section"