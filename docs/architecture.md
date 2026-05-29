# Web Frontend Architecture: ROS Web Bridge

## Overview

React TypeScript application that provides web interface for ROS-Web bridge system. Connects to ROS backend via WebSocket to control bag file playback and display camera image streams.

**Project**: web_frontend  
**Location**: `/home/robot/projects/web_frontend/`  
**Stack**: React 19.2.6 + TypeScript + Vite + Tailwind CSS + shadcn/ui  
**ROS Integration**: roslibjs 2.1.0

## Architecture

```
Browser Runtime (JavaScript)
┌─────────────────────────────────────────┐
│ React Application                        │
│ ┌─────────────────────────────────────┐ │
│ │ App Component                       │ │
│ │  - WebSocket connection             │ │
│ │  - ROS service calls                │ │
│ │  - Image streaming                  │ │
│ │  - UI controls and status           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                     │ WebSocket (http://localhost:9090)
                     ▼
              rosbridge_server (ROS)
                     │ ROS Topics/Services
                     ▼
              ros_web_bridge_node (ROS)
                     │ Bag Playback
                     ▼
              Bag File (ROS bag)
```

## Component Architecture

### Main Application Structure

```typescript
App.tsx (Root Component)
├── ROS Connection Management
│   ├── WebSocket connection to rosbridge
│   ├── ROSLIB.Ros instance management
│   └── Connection status tracking
├── Service Integration
│   ├── PlayBag service client setup
│   ├── Service call handlers (play/stop)
│   └── Service result tracking
├── Image Streaming
│   ├── Topic subscription (/camera/color/image_raw)
│   ├── ROS Image message decoding
│   └── Base64 data URL conversion
└── UI Components
    ├── Connection status display
    ├── Play/Stop control buttons
    ├── Camera stream display
    └── Connection information
```

### Data Flow

1. **Connection Establishment**
   - App mounts → ROSLIB.Ros connects to `http://localhost:9090`
   - Connection events update React state
   - Service and topic setup upon successful connection

2. **Bag Playback Control**
   - User clicks "Play" → calls `/ros_web_bridge_node/play_bag` service
   - Service response updates UI status
   - BagPlayer starts publishing camera images

3. **Image Streaming**
   - Camera images published to `/camera/color/image_raw`
   - React subscribes to topic and receives Image messages
   - Messages converted to base64 data URLs for display

## Module Details

### Core Components

#### App.tsx (Primary Application)
- **File**: `src/App.tsx`
- **Function**: Main React component orchestrating all functionality
- **Hooks Used**: `useState`, `useEffect`, `useRef`
- **ROS Integration**: Manages ROS connection lifecycle and message handling

#### ROS Connection Manager (in App.tsx)
- **WebSocket URL**: `http://localhost:9090`
- **Connection Handling**: Auto-reconnect, error handling, status tracking
- **Lifecycle**: Cleanup on component unmount

#### Service Client (PlayBag Service)
- **Service Name**: `/ros_web_bridge_node/play_bag`
- **Service Type**: `ros_web_bridge/PlayBag`
- **Request Structure**: `{ start: boolean }`
- **Response Structure**: `{ success: boolean }`

#### Image Stream Handler
- **Topic**: `/camera/color/image_raw`
- **Message Type**: `sensor_msgs/Image`
- **Encoding**: `rgb8` (converted to base64 data URL for display)
- **Display**: `<img>` element with data URL source

### UI Components (shadcn/ui)

#### Core UI Components Used
- **Button**: Play/Stop controls with disabled states
- **Card**: Content containers with headers
- **Badge**: Connection status indicators
- **Layout**: Grid system and spacing

#### Styling Approach
- **Framework**: Tailwind CSS with shadcn/ui component library
- **Theme**: Default shadcn/ui light theme
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG-compliant component library

## Technology Stack

### Frontend Framework
- **React**: 19.2.6 with functional components and hooks
- **TypeScript**: Full type safety for ROS integration
- **Vite**: Fast development server and build tool

### Styling and UI
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library (40+ pre-configured components)
- **Radix UI**: Underlying primitive components

### ROS Integration
- **roslibjs**: ROS WebSocket client library
- **WebSocket**: Browser-native WebSocket API
- **CBOR**: Message serialization (via `cbor2` library)

### Development Tools
- **pnpm**: Fast package manager
- **Node.js**: Runtime environment
- **ESLint/Prettier**: Code formatting and linting

## Configuration Files

### Key Configuration Files
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration  
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Build and Development Scripts
```json
"dev": "vite",           // Development server
"build": "vite build",   // Production build
"preview": "vite preview" // Preview production build
```

## External Dependencies

### Core Dependencies
- `roslib` (2.1.0) - ROS WebSocket client
- `@radix-ui/*` - UI component primitives
- `uuid` (11.1.1) - UUID generation (roslib compatibility)

### Runtime Dependencies
- `cbor2` - CBOR serialization for roslib
- `fast-png` - PNG image processing

### Development Dependencies
- `@types/react` - TypeScript definitions
- `@vitejs/plugin-react` - Vite React integration

## Known Limitations

1. **Single Service/Topic**: Currently only supports PlayBag service and camera image topic
2. **WebSocket Dependency**: Requires `rosbridge_server` running on port 9090
3. **No Reconnection Logic**: Simple connection handling without smart reconnection
4. **Basic Error Handling**: Minimal error recovery mechanisms
5. **Static Configuration**: WebSocket URL and service names hardcoded

## Integration Points

### Backend Integration
- **WebSocket Endpoint**: `http://localhost:9090` (rosbridge_server)
- **Expected Services**: `/ros_web_bridge_node/play_bag`
- **Subscribed Topics**: `/camera/color/image_raw`

**Related Documentation**: 
- [Backend Architecture](../../catkin_ws2/docs/architecture.md) - ROS backend architecture
- [Backend Decisions](../../catkin_ws2/docs/decisions.md) - Backend design decisions

### Development Integration
- **Package Manager**: pnpm (compatible with ROS workspace)
- **Build Process**: Standard Vite build pipeline
- **Deployment**: Static file serving (no server required)