import { useState, useEffect, useRef } from 'react';
import { Ros, Topic, Service } from 'roslib';
import { ROS_WS_URL } from './config';
import { decodePointCloud2, type PointCloud2 } from './lib/pointcloud2';
import { type PointCloudFrame } from './components/PointCloudView';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import StatusBar from './components/StatusBar';

// ---- Device ID (persisted per browser tab) ----
function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

const DEVICE_ID = getDeviceId();

// ---- Playback state (mirrors backend /playback_status topic) ----
interface PlaybackState {
  state: 'idle' | 'playing';
  owner_device_id: string;
  bag_path: string;
  started_at: string;
}

const INITIAL_PLAYBACK: PlaybackState = {
  state: 'idle',
  owner_device_id: '',
  bag_path: '',
  started_at: '',
};

// ---- Object detection: per-class closest distance ----
interface ObjDistItem {
  class_name: string;
  distance: number;
}
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
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showDetectionCloud, setShowDetectionCloud] = useState(false);
  const [filterFrame, setFilterFrame] = useState<PointCloudFrame | null>(null);
  const [filterStats, setFilterStats] = useState<{ count: number; frameId: string } | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);

  // Multi-device playback state
  const [playback, setPlayback] = useState<PlaybackState>(INITIAL_PLAYBACK);
  const [playLoading, setPlayLoading] = useState(false);
  const [closestDistances, setClosestDistances] = useState<ObjDistItem[]>([]);
  const [bagPath, setBagPath] = useState('/home/robot/data/calib/lidar_vision_ip2/lvdata_2026-05-11-15-54-05.bag');

  const rosRef = useRef<Ros | null>(null);
  const cameraInfoTopicRef = useRef<Topic | null>(null);
  const filterTopicRef = useRef<Topic | null>(null);
  const detectionsTopicRef = useRef<Topic | null>(null);
  const serviceRef = useRef<Service | null>(null);
  const playbackTopicRef = useRef<Topic | null>(null);
  const getStateRef = useRef<Service | null>(null);
  const closestDistTopicRef = useRef<Topic | null>(null);

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
      setPlayback(INITIAL_PLAYBACK);
      setOnlineMode(false);
      setPlayLoading(false);
      setStreamActive(false);
      setStreamError(null);
      setCameraInfo(null);
      setClosestDistances([]);
      setFilterFrame(null);
      setFilterStats(null);
      setDetections([]);
    });

    setRos(rosInstance);

    return () => {
      if (cameraInfoTopicRef.current) cameraInfoTopicRef.current.unsubscribe();
      if (filterTopicRef.current) filterTopicRef.current.unsubscribe();
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
      setPlayback(INITIAL_PLAYBACK);
      setOnlineMode(false);
      setPlayLoading(false);
      setStreamActive(false);
      setStreamError(null);
      setCameraInfo(null);
      setClosestDistances([]);
      setFilterFrame(null);
      setFilterStats(null);
      setDetections([]);
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

  // Playback status subscription (latched topic — multi-device sync)
  useEffect(() => {
    if (!ros || !status.connected) return;
    const topic = new Topic({ ros, name: '/playback_status', messageType: 'ros_web_bridge/PlaybackStatus' });
    topic.subscribe((msg: any) => {
      setPlayback({
        state: msg.state || 'idle',
        owner_device_id: msg.owner_device_id || '',
        bag_path: msg.bag_path || '',
        started_at: msg.started_at || '',
      });
    });
    playbackTopicRef.current = topic;

    // Query current state on connect (in case another device already started)
    const getStateSvc = new Service({ ros, name: '/ros_web_bridge_node/get_playback_state', serviceType: 'ros_web_bridge/GetPlaybackState' });
    getStateRef.current = getStateSvc;
    getStateSvc.callService({}, (result: any) => {
      setPlayback({
        state: result.state || 'idle',
        owner_device_id: result.owner_device_id || '',
        bag_path: result.bag_path || '',
        started_at: result.started_at || '',
      });
    });

    return () => { topic.unsubscribe(); playbackTopicRef.current = null; getStateRef.current = null; };
  }, [ros, status.connected]);

  // /object/closest_distances subscription
  useEffect(() => {
    if (!ros || !status.connected) return;
    const topic = new Topic({ ros, name: '/object/closest_distances', messageType: 'std_msgs/String' });
    topic.subscribe((msg: any) => {
      try {
        const data = JSON.parse(msg.data);
        const items = Array.isArray(data) ? data : (data.objects ?? []);
        if (Array.isArray(items)) {
          setClosestDistances(items.map((item: any) => ({
            class_name: String(item.class_name ?? item.class ?? ''),
            distance: Number(item.distance ?? 0),
          })));
        }
      } catch { /* ignore parse errors */ }
    });
    closestDistTopicRef.current = topic;
    return () => { topic.unsubscribe(); closestDistTopicRef.current = null; };
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
    setPlayLoading(true);
    serviceRef.current.callService({ start, device_id: DEVICE_ID, bag_path: bagPath }, (response: any) => {
      setPlayLoading(false);
      setStatus(prev => ({ ...prev, serviceResult: { success: response.success, timestamp: new Date() } }));
      // Update playback state from response
      setPlayback({
        state: response.state || 'idle',
        owner_device_id: response.owner_device_id || '',
        bag_path: response.bag_path || '',
        started_at: response.started_at || '',
      });
    });
  };

  const [onlineMode, setOnlineMode] = useState(false);

  // Derive mode: playback state takes priority, then online mode
  const mode: 'idle' | 'bag' | 'online' = playback.state === 'playing' ? 'bag' : (onlineMode ? 'online' : 'idle');

  const handlePlayBag = () => { callService(true); setStreamActive(true); setStreamError(null); };
  const handleStopBag = () => { callService(false); setStreamActive(false); setStreamError(null); };
  const handleGoOnline = () => { setOnlineMode(true); setStreamActive(true); setStreamError(null); };
  const handleBackToIdle = () => { if (mode === 'bag') handleStopBag(); else { setOnlineMode(false); setStreamActive(false); setStreamError(null); } };
  const handleStreamError = () => { setStreamError('Stream unavailable — is web_video_server running?'); };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode !== 'idle') handleBackToIdle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode]);

  // Stop playback via HTTP bridge on page unload (graceful disconnect)
  useEffect(() => {
    const onUnload = () => {
      if (playback.state === 'playing') {
        try {
          const payload = JSON.stringify({ device_id: DEVICE_ID });
          navigator.sendBeacon(
            'http://' + window.location.hostname + ':9094/stop_bag',
            new Blob([payload], { type: 'application/json' }),
          );
        } catch { /* best-effort */ }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [playback.state]);

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
          isPlaying={playback.state === 'playing'}
          showDetectionCloud={showDetectionCloud}
          cameraInfo={cameraInfo}
          detections={detections}
          streamError={streamError}
          onStreamError={handleStreamError}
          filterFrame={filterFrame}
          filterStats={filterStats}
          closestDistances={closestDistances}
          streamActive={streamActive}
          onPlayBag={handlePlayBag}
          onStopBag={handleStopBag}
          onGoOnline={handleGoOnline}
          onBackToIdle={handleBackToIdle}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleDetectionCloud={setShowDetectionCloud}
          playbackState={playback.state}
          ownerDeviceId={playback.owner_device_id}
          deviceId={DEVICE_ID}
          playLoading={playLoading}
          bagPath={bagPath}
          onBagPathChange={setBagPath}
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
