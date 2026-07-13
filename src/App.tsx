import { useState, useEffect, useRef } from 'react';
import { Ros, Topic, Service } from 'roslib';
import { ROS_WS_URL } from './config';
import { decodePointCloud2, type PointCloud2 } from './lib/pointcloud2';
import { type PointCloudFrame } from './components/PointCloudView';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import StatusBar from './components/StatusBar';
interface ROSStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  serviceResult?: {
    success: boolean;
    timestamp: Date;
  };
}

interface CameraInfo {
  width: number;
  height: number;
  distortionModel: string;
  timestamp: Date;
}

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

type ThemeMode = 'dark' | 'light';

function App() {
  // ---- Theme ----
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ---- ROS state ----
  const [ros, setRos] = useState<Ros | null>(null);
  const [status, setStatus] = useState<ROSStatus>({ connected: false, connecting: false });
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [mode, setMode] = useState<'idle' | 'bag' | 'online'>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showDetectionCloud, setShowDetectionCloud] = useState(false);
  const [filterFrame, setFilterFrame] = useState<PointCloudFrame | null>(null);
  const [filterStats, setFilterStats] = useState<{ count: number; frameId: string } | null>(null);
  const [detectionFrame, setDetectionFrame] = useState<PointCloudFrame | null>(null);
  const [detectionStats, setDetectionStats] = useState<{ count: number; frameId: string } | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);

  const rosRef = useRef<Ros | null>(null);
  const cameraInfoTopicRef = useRef<Topic | null>(null);
  const filterTopicRef = useRef<Topic | null>(null);
  const detectionTopicRef = useRef<Topic | null>(null);
  const detectionsTopicRef = useRef<Topic | null>(null);
  const serviceRef = useRef<Service | null>(null);

  // Connect to ROS bridge
  useEffect(() => {
    const rosInstance = new Ros({ url: ROS_WS_URL });
    setStatus({ connected: false, connecting: true });

    rosInstance.on('connection', () => {
      rosRef.current = rosInstance;
      setStatus({ connected: true, connecting: false });
    });
    rosInstance.on('error', (error: any) => {
      rosRef.current = null;
      setStatus({ connected: false, connecting: false, error: error.message || 'Connection error' });
    });
    rosInstance.on('close', () => {
      rosRef.current = null;
      setStatus({ connected: false, connecting: false });
    });

    setRos(rosInstance);

    return () => {
      if (cameraInfoTopicRef.current) cameraInfoTopicRef.current.unsubscribe();
      if (filterTopicRef.current) filterTopicRef.current.unsubscribe();
      if (detectionTopicRef.current) detectionTopicRef.current.unsubscribe();
      if (detectionsTopicRef.current) detectionsTopicRef.current.unsubscribe();
      rosInstance.close();
    };
  }, []);

  // Manual connect/disconnect
  const handleConnect = () => {
    if (rosRef.current) {
      rosRef.current.close();
      rosRef.current = null;
    }
    const rosInstance = new Ros({ url: ROS_WS_URL });
    setStatus({ connected: false, connecting: true });

    rosInstance.on('connection', () => {
      rosRef.current = rosInstance;
      setRos(rosInstance);
      setStatus({ connected: true, connecting: false });
    });
    rosInstance.on('error', (error: any) => {
      rosRef.current = null;
      setStatus({ connected: false, connecting: false, error: error.message || 'Connection error' });
    });
    rosInstance.on('close', () => {
      rosRef.current = null;
      setStatus({ connected: false, connecting: false });
    });
  };

  const handleDisconnect = () => {
    if (rosRef.current) {
      rosRef.current.close();
      rosRef.current = null;
    }
    setRos(null);
    setStatus({ connected: false, connecting: false });
  };

  // Camera info subscription
  useEffect(() => {
    if (!ros || !status.connected) return;
    const topic = new Topic({ ros, name: '/camera/color/camera_info', messageType: 'sensor_msgs/CameraInfo' });
    topic.subscribe((message: any) => {
      if (message.width && message.height) {
        setCameraInfo({ width: message.width, height: message.height, distortionModel: message.distortion_model || 'unknown', timestamp: new Date() });
      }
    });
    cameraInfoTopicRef.current = topic;
    return () => { topic.unsubscribe(); cameraInfoTopicRef.current = null; };
  }, [ros, status.connected]);

  // PlayBag service
  useEffect(() => {
    if (!ros || !status.connected) return;
    const svc = new Service({ ros, name: '/ros_web_bridge_node/play_bag', serviceType: 'ros_web_bridge/PlayBag' });
    serviceRef.current = svc;
  }, [ros, status.connected]);

  // Filter cloud subscription
  useEffect(() => {
    if (!ros || !status.connected || !streamActive) {
      if (filterTopicRef.current) { filterTopicRef.current.unsubscribe(); filterTopicRef.current = null; }
      setFilterFrame(null);
      return;
    }
    const topic = new Topic({ ros, name: '/livox/filtered', messageType: 'sensor_msgs/PointCloud2', compression: 'cbor' });
    topic.subscribe((message: any) => {
      const decoded = decodePointCloud2(message as PointCloud2);
      if (decoded.count > 0) {
        setFilterFrame({ positions: decoded.positions, intensities: decoded.intensities, count: decoded.count, frameId: decoded.frameId });
        setFilterStats({ count: decoded.count, frameId: decoded.frameId });
      }
    });
    filterTopicRef.current = topic;
    return () => { topic.unsubscribe(); filterTopicRef.current = null; };
  }, [ros, status.connected, streamActive]);

  // Detection cloud enable service
  useEffect(() => {
    if (!ros || !status.connected) return;
    const svc = new Service({ ros, name: '/camera_frame_node/set_enabled', serviceType: 'std_srvs/SetBool' });
    svc.callService({ data: showDetectionCloud }, (response: any) => console.log('Detection enable:', response.message));
  }, [ros, status.connected, showDetectionCloud]);

  // Detection cloud subscription
  useEffect(() => {
    if (!ros || !status.connected || !streamActive || !showDetectionCloud) {
      if (detectionTopicRef.current) { detectionTopicRef.current.unsubscribe(); detectionTopicRef.current = null; }
      setDetectionFrame(null);
      return;
    }
    const topic = new Topic({ ros, name: '/livox/inbox_voxel', messageType: 'sensor_msgs/PointCloud2', compression: 'cbor' });
    topic.subscribe((message: any) => {
      const decoded = decodePointCloud2(message as PointCloud2);
      if (decoded.count > 0) {
        setDetectionFrame({ positions: decoded.positions, intensities: decoded.intensities, count: decoded.count, frameId: decoded.frameId });
        setDetectionStats({ count: decoded.count, frameId: decoded.frameId });
      }
    });
    detectionTopicRef.current = topic;
    return () => { topic.unsubscribe(); detectionTopicRef.current = null; };
  }, [ros, status.connected, streamActive, showDetectionCloud]);

  // Detections pixel subscription
  useEffect(() => {
    if (!ros || !status.connected || !streamActive || !showDetectionCloud) {
      if (detectionsTopicRef.current) { detectionsTopicRef.current.unsubscribe(); detectionsTopicRef.current = null; }
      setDetections([]);
      return;
    }
    const topic = new Topic({ ros, name: '/detections/pixel', messageType: 'std_msgs/String' });
    topic.subscribe((message: any) => {
      try {
        const data = JSON.parse(message.data);
        if (Array.isArray(data.detections)) {
          setDetections(data.detections.map((d: any) => ({ class_id: d.class_id, class_name: d.class_name || '', confidence: d.confidence, bbox: d.bbox })));
        }
      } catch (e) { console.error('Parse error:', e); }
    });
    detectionsTopicRef.current = topic;
    return () => { topic.unsubscribe(); detectionsTopicRef.current = null; };
  }, [ros, status.connected, streamActive, showDetectionCloud]);

  // ---- Actions ----
  const callService = async (start: boolean) => {
    if (!serviceRef.current) { setStatus(prev => ({ ...prev, error: 'Service not available' })); return; }
    serviceRef.current.callService({ start }, (response: any) => {
      setStatus(prev => ({ ...prev, serviceResult: { success: response.success, timestamp: new Date() } }));
    });
  };

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayBag = () => { callService(true); setMode('bag'); setStreamActive(true); setStreamError(null); setIsPlaying(true); };
  const handleStopBag = () => { callService(false); setMode('idle'); setStreamActive(false); setStreamError(null); setIsPlaying(false); };
  const handleGoOnline = () => { setMode('online'); setStreamActive(true); setStreamError(null); };
  const handleBackToIdle = () => { if (mode === 'bag') handleStopBag(); else { setMode('idle'); setStreamActive(false); setStreamError(null); } };
  const handleStreamError = () => { setStreamError('Stream unavailable — is web_video_server running?'); };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode !== 'idle') handleBackToIdle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode]);

  // Count active topics
  const activeTopics = streamActive ? (showDetectionCloud ? 4 : 2) : 0;

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="app-main">
        <Dashboard
          connected={status.connected}
          connecting={status.connecting}
          connectionError={status.error ?? null}
          mode={mode}
          isPlaying={isPlaying}
          showDetectionCloud={showDetectionCloud}
          cameraInfo={cameraInfo}
          detections={detections}
          streamError={streamError}
          onStreamError={handleStreamError}
          filterFrame={filterFrame}
          filterStats={filterStats}
          detectionFrame={detectionFrame}
          detectionStats={detectionStats}
          streamActive={streamActive}
          onPlayBag={handlePlayBag}
          onStopBag={handleStopBag}
          onGoOnline={handleGoOnline}
          onBackToIdle={handleBackToIdle}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleDetectionCloud={setShowDetectionCloud}
        />
      </main>
      <StatusBar
        mode={mode}
        connected={status.connected}
        connectionError={status.error ?? null}
        serviceResult={status.serviceResult}
        activeTopics={activeTopics}
      />
    </div>
  );
}

export default App;
