# ROS Web Bridge - Frontend Application

React frontend for the ROS Web Bridge project. Provides web interface to control ROS bag file playback and display camera image streams via MJPEG over HTTP.

## Overview

This frontend application connects to a ROS backend via WebSocket (ROSLIB.js) and HTTP MJPEG stream (`web_video_server`) to:
- Control bag file playback (play/stop) via ROS service calls
- Display camera image streams via MJPEG over HTTP
- Monitor ROS connection status
- Provide user-friendly interface for robotics data visualization

**Backend Project**: [catkin_ws2](../catkin_ws2/) (ROS workspace)

## Architecture

- **Frontend**: React 19.2.6 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **ROS Integration**: roslibjs WebSocket client + MJPEG HTTP stream
- **WebSocket**: `ws://localhost:9092` (rosbridge_server)
- **MJPEG Stream**: `http://localhost:9093/stream?topic=/camera/color/image_raw` (web_video_server)
- **Services**: `/ros_web_bridge_node/play_bag` (start/stop bag playback)
- **Topics**: 
  - `/camera/color/camera_info` (camera calibration and resolution data)

> **Note**: The camera image stream is served via `web_video_server` (MJPEG over HTTP), not raw ROS topic subscription. This avoids expensive JavaScript canvas pixel decoding and provides better performance. The `web_video_server` is started automatically by the backend launch file.

## 🚀 How to Run / Compile

### Prerequisites

1. **Node.js and pnpm**:
   ```bash
   # Check if Node.js is installed
   node --version  # Should be 18+
   
   # Install pnpm if not available
   npm install -g pnpm
   pnpm --version
   ```

2. **ROS Backend Setup**:
   - Ensure ROS backend is running (see [backend setup](../catkin_ws2/))
   - `rosbridge_server` must be accessible at `ws://localhost:9092`
   - Bag file playback must be available via the ROS service

### Step-by-Step Instructions

**Option 1: Development Mode** (Recommended for testing)
```bash
# 1. Install dependencies
pnpm install

# 2. Start development server
pnpm dev

# 3. Open browser to http://localhost:5173
```

**Option 2: Production Build**
```bash
# 1. Install dependencies (if not already done)
pnpm install

# 2. Build for production
pnpm build

# 3. Preview production build
pnpm preview

# 4. Open browser to http://localhost:4173
```

**Option 3: Development Server with Auto-Start**
```bash
# Run this one command to start everything:
pnpm install && pnpm dev
```

### Quick Setup Check
_No setup script available — ensure dependencies are installed manually as described above._

### One-Command Start
Use this script to install dependencies and start everything:
```bash
./start.sh
```

### Quick Verification

After starting the development server, verify everything is working:

1. **Check if server is running**:
   ```bash
   # Should see something like:
   # > Local: http://localhost:5173/
   # > Network: http://192.168.x.x:5173/
   ```

2. **Test ROS connection**:
   - Open browser to http://localhost:5173
   - Should show "Connected" status (green badge)
   - If "Disconnected", check `rosbridge_server` is running

3. **Test camera streaming**:
   - Click "Play Bag" button
   - Browser loads MJPEG stream from `web_video_server` at `http://localhost:9093`
   - Should see camera image appear
   - Should display resolution (e.g., "1280 × 720")
   - Should show distortion model (e.g., "plumb_bob")
   - **No image data?** Ensure `web_video_server` is running (it starts with `ros_web_bridge.launch`)

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open http://localhost:5173 to view the application.

### Building

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
web_frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx            # React entry point
│   ├── components/ui/      # shadcn/ui components
│   └── lib/utils.ts        # Utility functions
├── docs/                   # Project documentation
│   └── architecture.md     # Technical architecture
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

### Core Development Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Entry point — mounts the React app to the DOM |
| `src/App.tsx` | Root component — where the main app layout, ROS connection, and page logic live |
| `src/index.css` | Global styles + Tailwind CSS directives |
| `src/components/ui/` | **shadcn/ui** components — pre-built, reusable UI pieces (button, card, dialog, toast, etc.) |
| `src/lib/utils.ts` | Utility helpers (e.g., `cn()` for Tailwind class merging) |
| `src/hooks/use-toast.ts` | Custom hook for toast/sonner notifications |
| `vite.config.ts` | Vite build tool configuration |
| `tailwind.config.js` | Tailwind CSS customization (theme, colors, etc.) |
| `package.json` | Dependencies, scripts, and project metadata |

Think of these as the `src/*.cpp` equivalent in a ROS package — the files you'll edit most during development.

## Documentation

- [Architecture](docs/architecture.md) - Technical architecture and design

**Related Documentation**: 
- [Backend Documentation](../catkin_ws2/docs/) - ROS backend documentation
- [Main Project CLAUDE.md](../catkin_ws2/CLAUDE.md) - Overall project overview

## Features

### Current Features
- ✅ WebSocket connection to ROS backend
- ✅ Bag playback control (play/stop)
- ✅ Camera image streaming via MJPEG over HTTP (web_video_server)
- ✅ Camera info display (resolution, distortion model, timestamp)
- ✅ Connection status monitoring
- ✅ Professional UI with shadcn/ui components
- ✅ Type-safe integration with TypeScript

### Planned Features
- Connection retry and auto-reconnect
- Error handling and user feedback
- Multiple camera stream support
- Playback controls (pause, speed)

## Dependencies

### Core Dependencies
- `roslib` (2.1.0) - ROS WebSocket client

  > **Import note**: roslib v2.1.0 ships as an ES module and does **not** provide a default export.
  > Use named imports instead of the legacy `import ROSLIB from 'roslib'` pattern:
  > ```typescript
  > import { Ros, Topic, Service } from 'roslib';
  > ```
  > Service request objects are plain JavaScript objects, not `new ServiceRequest()`.

- `uuid` (11.1.1) - UUID generation (roslib compatibility)
- `@radix-ui/*` - UI component primitives

### Development Dependencies
- `vite` - Build tool and dev server
- `tailwindcss` - CSS framework
- `typescript` - Type safety

## 🔧 Compilation & Build Troubleshooting

### Common Issues and Solutions

#### 1. **TypeScript Deprecation Warning**
```
tsconfig.json(12,5): error TS5101: Option 'baseUrl' is deprecated...
```
**Solution**: This is just a warning, not an error. The build will still work. To fix:
- Open `tsconfig.app.json` and `tsconfig.json`
- Add `"ignoreDeprecations": "6.0"` to the `compilerOptions` section

#### 2. **pnpm Command Not Found**
```
bash: pnpm: command not found
```
**Solution**: Install pnpm globally:
```bash
npm install -g pnpm
```

#### 3. **Dependencies Not Installed**
```
Error: Cannot find module 'react' or 'roslib'
```
**Solution**: Install dependencies:
```bash
pnpm install
```

#### 4. **Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5173
```
**Solution**: Kill the process on port 5173 or use a different port:
```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
# OR modify vite.config.ts to use a different port
```

#### 5. **WebSocket Connection Failed**
```
ROS connection error: WebSocket connection failed
```
**Solution**: Ensure ROS backend is running on port **9092** (matches the frontend configuration at `ws://localhost:9092`):
```bash
# In a separate terminal
cd ../catkin_ws2
source devel/setup.bash
roslaunch ros_web_bridge ros_web_bridge.launch
```

If rosbridge is running on a different port, update the URL in `App.tsx` accordingly.

#### 6. **MJPEG Stream Shows Broken Image / Error**
```
Stream unavailable — is web_video_server running on port 9093?
```
**Solution**: Verify `web_video_server` started with the launch file:
```bash
# Check if web_video_server is running
ps aux | grep web_video_server

# If not, start it manually (or check the launch file includes it):
rosrun web_video_server web_video_server _port:=9093 _address:=localhost
```

#### 7. **MJPEG Stream CORS / Mixed Content**
```
Access to image at http://localhost:9093/... has been blocked by CORS policy
```
**Solution**: Ensure the frontend and backend are both accessed over `localhost` (not `127.0.0.1` or a different hostname).

#### 8. **Build Fails with Type Errors**
```
Type error: Property 'width' does not exist on type 'any'
```
**Solution**: Check the TypeScript types in `App.tsx`. The latest version should have proper typing for CameraInfo messages.

#### 9. **ROSLIB Import Error - "does not provide an export named 'default'"**
```
Uncaught SyntaxError: The requested module '/node_modules/.vite/deps/roslib.js?v=25fdab7c' does not provide an export named 'default' (at App.tsx:5:8)
```
**Solution**: ROSLIB v2.1.0 uses ES modules without default export. Update the import in `App.tsx`:
```typescript
// OLD (incorrect):
import ROSLIB from 'roslib';

// NEW (correct):
import { Ros, Topic, Service } from 'roslib';
```
Also update all references from `ROSLIB.Ros` to `Ros`, `ROSLIB.Topic` to `Topic`, etc. Service requests should be plain objects, not `new ServiceRequest()`.

### Build Commands Reference
```bash
# Check TypeScript compilation (no output means success)
npx tsc --noEmit

# Run linter
pnpm lint

# Clear build cache
rm -rf node_modules/.vite
rm -rf .parcel-cache

# Fix ROSLIB import syntax if needed
# See Troubleshooting section for ROSLIB import errors
```

For more issues, see the [detailed troubleshooting guide](docs/troubleshooting.md).

## Backend Integration

This frontend requires the ROS backend to be running:

```bash
# In the catkin workspace
cd ../catkin_ws2
roslaunch ros_web_bridge ros_web_bridge.launch
```

This launch file starts three services:
- **rosbridge_server** (WebSocket on port 9092) — for service calls and camera info
- **web_video_server** (HTTP MJPEG on port 9093) — for camera image streaming
- **ros_web_bridge_node** — bag playback service

The frontend connects to both:
- `ws://localhost:9092` — ROS WebSocket (service calls, camera_info topic)
- `http://localhost:9093` — MJPEG stream (camera image display)

> To use a different port for web_video_server, pass the argument:
> ```bash
> roslaunch ros_web_bridge ros_web_bridge.launch web_video_port:=9094
> ```
> Then update the `MJPEG_STREAM_URL` constant in `src/App.tsx` to match.

## Contributing

This is a learning project focused on ROS-Web integration. The architecture follows modern React patterns with clean separation between frontend and backend components.
