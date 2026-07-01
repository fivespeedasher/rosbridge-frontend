#!/bin/bash
set -e

# Allow running from anywhere — cd to the script's directory
cd "$(dirname "$0")"

echo "🚀 Starting ROS Web Bridge Frontend..."

# 1. Dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# 2. Quick setup check (Node, pnpm, deps, TS, ROS bridge)
echo "🔍 Running quick setup check..."
./check-setup.sh

# 3. Backend reminder
echo ""
echo "📌 Backend (rosbridge :9092, web_video_server :9093):"
echo "   roslaunch ros_web_bridge ros_web_bridge.launch"
echo ""

# 4. Dev server
echo "✅ Starting development server..."
echo "🌐 Open browser to: http://localhost:5173"
echo "   (LAN: http://<this-host>:5173 — server binds 0.0.0.0)"
echo "   Ctrl+C to stop"
echo ""

pnpm dev
