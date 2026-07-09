import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Ros, Topic, Service } from 'roslib';
import { ROS_WS_URL, STREAM_URL, STREAM_TYPE } from './config';
import { decodePointCloud2, type PointCloud2 } from './lib/pointcloud2';
import PointCloudView, { type PointCloudFrame } from './components/PointCloudView';

interface ROSStatus {
  connected: boolean;
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
  bbox: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
}

const DETECTION_COLORS: Record<string, string> = {
  box: 'blue',
  person: 'green',
  pallet: 'pink',
  canvas: 'yellow',
};

function App() {
  const [ros, setRos] = useState<Ros | null>(null);
  const [status, setStatus] = useState<ROSStatus>({ connected: false });
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [mode, setMode] = useState<'idle' | 'bag' | 'online'>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const [showCloudFilter, setShowCloudFilter] = useState(true); // default on — only filtered cloud used
  const [filterFrame, setFilterFrame] = useState<PointCloudFrame | null>(null);
  const [filterStats, setFilterStats] = useState<{ count: number; frameId: string } | null>(null);
  const [showDetectionCloud, setShowDetectionCloud] = useState(false);
  const [detectionFrame, setDetectionFrame] = useState<PointCloudFrame | null>(null);
  const [detectionStats, setDetectionStats] = useState<{ count: number; frameId: string } | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  // Carriage info (from ROS topic)
  const [carriageL, setCarriageL] = useState<number | null>(null);
  const [carriageW, setCarriageW] = useState<number | null>(null);
  const [carriageH, setCarriageH] = useState<number | null>(null);
  // Environment info (from ROS topic)
  const [closestObject, setClosestObject] = useState<number | null>(null);
  const [leftSpace, setLeftSpace] = useState<number | null>(null);
  const [rightSpace, setRightSpace] = useState<number | null>(null);
  const cameraInfoTopicRef = useRef<Topic | null>(null);
  const filterTopicRef = useRef<Topic | null>(null);
  const detectionTopicRef = useRef<Topic | null>(null);
  const detectionsTopicRef = useRef<Topic | null>(null);
  const serviceRef = useRef<Service | null>(null);

  // Connect to ROS bridge
  useEffect(() => {
    console.log(`Attempting to connect to ROS bridge at ${ROS_WS_URL}`);
    const rosInstance = new Ros({
      url: ROS_WS_URL
    });

    rosInstance.on('connection', () => {
      console.log('Connected to ROS bridge');
      setStatus({ connected: true });
    });

    rosInstance.on('error', (error: any) => {
      console.error('ROS connection error:', error);
      setStatus({ connected: false, error: error.message || 'Connection error' });
    });

    rosInstance.on('close', () => {
      console.log('ROS connection closed');
      setStatus({ connected: false });
    });

    setRos(rosInstance);

    // Cleanup on unmount
    return () => {
      if (cameraInfoTopicRef.current) {
        cameraInfoTopicRef.current.unsubscribe();
      }
      if (filterTopicRef.current) {
        filterTopicRef.current.unsubscribe();
      }
      if (detectionTopicRef.current) {
        detectionTopicRef.current.unsubscribe();
      }
      if (detectionsTopicRef.current) {
        detectionsTopicRef.current.unsubscribe();
      }
      rosInstance.close();
    };
  }, []);

  // Subscribe to camera info topic when connected and showCamera is on.
  useEffect(() => {
    if (!ros || !status.connected) return;

    if (showCamera) {
      try {
        const cameraInfoTopic = new Topic({
          ros: ros,
          name: '/camera/color/camera_info',
          messageType: 'sensor_msgs/CameraInfo'
        });

        cameraInfoTopic.subscribe((message: any) => {
          if (message.width && message.height) {
            setCameraInfo({
              width: message.width,
              height: message.height,
              distortionModel: message.distortion_model || 'unknown',
              timestamp: new Date()
            });
          }
        });

        cameraInfoTopicRef.current = cameraInfoTopic;
      } catch (error) {
        console.error('Error setting up camera info topic:', error);
        setStatus(prev => ({ ...prev, error: 'Failed to set up camera info topic' }));
      }
    } else {
      if (cameraInfoTopicRef.current) {
        cameraInfoTopicRef.current.unsubscribe();
        cameraInfoTopicRef.current = null;
      }
      setCameraInfo(null);
    }

    return () => {
      if (cameraInfoTopicRef.current) {
        cameraInfoTopicRef.current.unsubscribe();
        cameraInfoTopicRef.current = null;
      }
    };
  }, [ros, status.connected, showCamera]);

  // Set up PlayBag service (always needed, no toggle)
  useEffect(() => {
    if (!ros || !status.connected) return;

    try {
      const bagService = new Service({
        ros: ros,
        name: '/ros_web_bridge_node/play_bag',
        serviceType: 'ros_web_bridge/PlayBag'
      });

      serviceRef.current = bagService;
    } catch (error) {
      console.error('Error setting up ROS topics:', error);
      setStatus(prev => ({ ...prev, error: 'Failed to set up topics' }));
    }
  }, [ros, status.connected]);

  // Subscribe to the filtered LiDAR point cloud (/livox/filtered)
  useEffect(() => {
    if (!ros || !status.connected) return;

    if (streamActive && showCloudFilter) {
      const filterTopic = new Topic({
        ros: ros,
        name: '/livox/filtered',
        messageType: 'sensor_msgs/PointCloud2',
        compression: 'cbor',
      });

      filterTopic.subscribe((message: any) => {
        const decoded = decodePointCloud2(message as PointCloud2);
        if (decoded.count > 0) {
          setFilterFrame({
            positions: decoded.positions,
            intensities: decoded.intensities,
            count: decoded.count,
            frameId: decoded.frameId,
          });
          setFilterStats({ count: decoded.count, frameId: decoded.frameId });
        }
      });

      filterTopicRef.current = filterTopic;
    } else {
      if (filterTopicRef.current) {
        filterTopicRef.current.unsubscribe();
        filterTopicRef.current = null;
      }
      setFilterFrame(null);
    }

    return () => {
      if (filterTopicRef.current) {
        filterTopicRef.current.unsubscribe();
        filterTopicRef.current = null;
      }
    };
  }, [ros, status.connected, streamActive, showCloudFilter]); // showCloudFilter defaults true

  // Enable/disable the backend camera_frame_node via service call
  useEffect(() => {
    if (!ros || !status.connected) return;

    const enableService = new Service({
      ros: ros,
      name: '/camera_frame_node/set_enabled',
      serviceType: 'std_srvs/SetBool',
    });

    enableService.callService({ data: showDetectionCloud }, (response: any) => {
      console.log('Detection Cloud enable service:', response.message);
    });

    // No cleanup needed — one-shot service call
  }, [ros, status.connected, showDetectionCloud]);

  // Subscribe to /camera/frame/points (detection LiDAR in camera frame)
  useEffect(() => {
    if (!ros || !status.connected) return;

    if (streamActive && showDetectionCloud) {
      const detTopic = new Topic({
        ros: ros,
        name: '/livox/inbox_voxel',
        messageType: 'sensor_msgs/PointCloud2',
        compression: 'cbor',
      });

      detTopic.subscribe((message: any) => {
        const decoded = decodePointCloud2(message as PointCloud2);
        if (decoded.count > 0) {
          setDetectionFrame({
            positions: decoded.positions,
            intensities: decoded.intensities,
            count: decoded.count,
            frameId: decoded.frameId,
          });
          setDetectionStats({ count: decoded.count, frameId: decoded.frameId });
        }
      });

      detectionTopicRef.current = detTopic;
    } else {
      if (detectionTopicRef.current) {
        detectionTopicRef.current.unsubscribe();
        detectionTopicRef.current = null;
      }
      setDetectionFrame(null);
    }

    return () => {
      if (detectionTopicRef.current) {
        detectionTopicRef.current.unsubscribe();
        detectionTopicRef.current = null;
      }
    };
  }, [ros, status.connected, streamActive, showDetectionCloud]);

  // Subscribe to /detections/pixel (bounding box detections as JSON string)
  useEffect(() => {
    if (!ros || !status.connected) return;

    if (streamActive && showDetectionCloud) {
      const detPixelTopic = new Topic({
        ros: ros,
        name: '/detections/pixel',
        messageType: 'std_msgs/String',
      });

      detPixelTopic.subscribe((message: any) => {
        try {
          const data = JSON.parse(message.data);
          if (Array.isArray(data.detections)) {
            setDetections(
              data.detections.map((d: any) => ({
                class_id: d.class_id,
                class_name: d.class_name || '',
                confidence: d.confidence,
                bbox: d.bbox,
              }))
            );
          }
        } catch (e) {
          console.error('Failed to parse /detections/pixel:', e);
        }
      });

      detectionsTopicRef.current = detPixelTopic;
    } else {
      if (detectionsTopicRef.current) {
        detectionsTopicRef.current.unsubscribe();
        detectionsTopicRef.current = null;
      }
      setDetections([]);
    }

    return () => {
      if (detectionsTopicRef.current) {
        detectionsTopicRef.current.unsubscribe();
        detectionsTopicRef.current = null;
      }
    };
  }, [ros, status.connected, streamActive, showDetectionCloud]);

  const callService = async (start: boolean) => {
    if (!serviceRef.current) {
      setStatus(prev => ({ ...prev, error: 'Service not available' }));
      return;
    }

    try {
      const request = {
        start: start
      };

      serviceRef.current.callService(request, (response: any) => {
        setStatus(prev => ({
          ...prev,
          serviceResult: {
            success: response.success,
            timestamp: new Date()
          }
        }));

        console.log(`Service call ${start ? 'start' : 'stop'}:`, response.success ? 'success' : 'failed');
      });
    } catch (error) {
      console.error('Service call error:', error);
      setStatus(prev => ({
        ...prev,
        error: 'Service call failed',
        serviceResult: {
          success: false,
          timestamp: new Date()
        }
      }));
    }
  };

  const handlePlayBag = () => {
    callService(true);
    setMode('bag');
    setStreamActive(true);
    setStreamError(null);
  };

  const handleStopBag = () => {
    callService(false);
    setMode('idle');
    setStreamActive(false);
    setStreamError(null);
  };

  const handleGoOnline = () => {
    setMode('online');
    setStreamActive(true);
    setStreamError(null);
  };

  const handleGoOffline = () => {
    setMode('idle');
    setStreamActive(false);
    setStreamError(null);
  };

  const getErrorMessage = () => {
    if (status.error) return status.error;
    if (!status.connected) return 'Disconnected from ROS bridge';
    return null;
  };

  const serviceStatusText = () => {
    if (!status.serviceResult) return 'No service calls yet';
    const timeAgo = Math.round((Date.now() - status.serviceResult.timestamp.getTime()) / 1000);
    return `Service call ${status.serviceResult.success ? 'succeeded' : 'failed'} ${timeAgo}s ago`;
  };

  const handleStreamError = () => {
    setStreamError(`Stream unavailable — is web_video_server running on port ${STREAM_URL.split(':')[2].split('/')[0]}?`);
  };

  const renderStream = () => {
    const overlayWidth = cameraInfo?.width || 1280;
    const overlayHeight = cameraInfo?.height || 720;
    const showOverlay = showDetectionCloud && detections.length > 0;

    const streamElement = STREAM_TYPE === 'h264' ? (
      <video
        src={STREAM_URL}
        className="max-w-full max-h-96 object-contain rounded"
        autoPlay
        muted
        playsInline
        onError={handleStreamError}
      />
    ) : (
      <img
        src={STREAM_URL}
        alt="ROS Camera MJPEG Stream"
        className="max-w-full max-h-96 object-contain rounded"
        onError={handleStreamError}
      />
    );

    if (!showOverlay) return streamElement;

    return (
      <div className="relative inline-block">
        {streamElement}
        <svg
          viewBox={`0 0 ${overlayWidth} ${overlayHeight}`}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {detections.map((det, i) => {
            const [xmin, ymin, xmax, ymax] = det.bbox;
            const detColor = DETECTION_COLORS[det.class_name] ?? 'blue';
            return (
              <g key={i}>
                <rect
                  x={xmin}
                  y={ymin}
                  width={xmax - xmin}
                  height={ymax - ymin}
                  fill="none"
                  stroke={detColor}
                  strokeWidth={Math.max(2, overlayWidth / 400)}
                />
                <text
                  x={xmin}
                  y={ymin - 4}
                  fill={detColor}
                  fontSize={Math.max(12, overlayWidth / 80)}
                  fontWeight="bold"
                >
                  {det.class_name} {(det.confidence * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>ROS Web Bridge</span>
                <Badge variant={status.connected ? 'default' : 'destructive'}>
                  {status.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Stream: /camera/color/image_raw
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Playback Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={mode === 'bag' ? handleStopBag : handlePlayBag}
                disabled={!status.connected || mode === 'online'}
                className={mode === 'bag'
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
                }
              >
                {mode === 'bag' ? 'Stop Bag' : 'Play Bag'}
              </Button>
              <Button
                onClick={mode === 'online' ? handleGoOffline : handleGoOnline}
                disabled={!status.connected || mode === 'bag'}
                variant={mode === 'online' ? 'default' : 'outline'}
                className={mode === 'online' ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {mode === 'online' ? 'Go Offline' : 'Go Online'}
              </Button>
            </div>

            {/* Toggle checkboxes for display sections */}
            <div className="flex items-center space-x-6 pt-1 flex-wrap gap-y-2">
              <label className="flex items-center space-x-2 text-sm cursor-pointer select-none">
                <Checkbox
                  id="show-camera"
                  checked={showCamera}
                  onCheckedChange={(checked) => setShowCamera(checked === true)}
                />
                <span>Camera Stream</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer select-none">
                <Checkbox
                  id="show-cloud-filter"
                  checked={showCloudFilter}
                  onCheckedChange={(checked) => setShowCloudFilter(checked === true)}
                />
                <span>Filter Cloud</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer select-none">
                <Checkbox
                  id="show-detection-cloud"
                  checked={showDetectionCloud}
                  onCheckedChange={(checked) => setShowDetectionCloud(checked === true)}
                />
                <span>Detection Cloud</span>
              </label>
            </div>

            {/* Status */}
            <div className="text-sm space-y-2">
              {getErrorMessage() && (
                <div className="text-red-600">Error: {getErrorMessage()}</div>
              )}
              <div className="text-muted-foreground">{serviceStatusText()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Carriage Info */}
        <Card>
          <CardHeader>
            <CardTitle>Carriage Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">L (mm)</div>
                <div className="text-2xl font-bold tabular-nums">{carriageL ?? '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">W (mm)</div>
                <div className="text-2xl font-bold tabular-nums">{carriageW ?? '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">H (mm)</div>
                <div className="text-2xl font-bold tabular-nums">{carriageH ?? '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Closest Object (mm)</div>
                <div className="text-2xl font-bold tabular-nums">{closestObject ?? '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Left Space (mm)</div>
                <div className="text-2xl font-bold tabular-nums">{leftSpace ?? '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Right Space (mm)</div>
                <div className="text-2xl font-bold tabular-nums">{rightSpace ?? '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camera Stream — hidden when unchecked */}
        {showCamera && (<Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Camera Stream</span>
              {cameraInfo && (
                <div className="text-sm font-normal text-muted-foreground">
                  Resolution: {cameraInfo.width} × {cameraInfo.height}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-64 flex items-center justify-center">
              {streamActive ? (
                <div className="flex flex-col items-center space-y-4 w-full">
                  {streamError ? (
                    <div className="text-destructive text-center">
                      <p className="font-semibold">Stream Error</p>
                      <p className="text-sm">{streamError}</p>
                    </div>
                  ) : (
                    <>
                      {renderStream()}
                      {cameraInfo && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Image Size: {cameraInfo.width} × {cameraInfo.height} pixels</div>
                          <div>Distortion Model: {cameraInfo.distortionModel}</div>
                          <div>Last Updated: {cameraInfo.timestamp.toLocaleTimeString()}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-center">
                  <p>No image data received yet</p>
                  <p className="text-sm">Click 'Play Bag' to start streaming</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>)}
        {/* Filter Cloud (/livox/filtered) */}
        {showCloudFilter && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filter Cloud</span>
              {filterStats && (
                <div className="text-sm font-normal text-muted-foreground">
                  {filterStats.count.toLocaleString()} pts · {filterStats.frameId}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
              {streamActive ? (
                <PointCloudView frame={filterFrame} height={480} />
              ) : (
                <div className="h-[480px] flex items-center justify-center text-muted-foreground text-center">
                  <div>
                    <p>No point cloud yet</p>
                    <p className="text-sm">Click 'Play Bag' to stream /livox/filtered</p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Drag to orbit to rotate · Scroll to zoom
            </div>
          </CardContent>
        </Card>)}

        {/* Detection Cloud (/livox/inbox_voxel — points inside detection bboxes) */}
        {showDetectionCloud && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detection Cloud</span>
              {detectionStats && (
                <div className="text-sm font-normal text-muted-foreground">
                  {detectionStats.count.toLocaleString()} pts · {detectionStats.frameId}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
              {streamActive ? (
                <PointCloudView frame={detectionFrame} height={480} pointSize={0.2} />
              ) : (
                <div className="h-[480px] flex items-center justify-center text-muted-foreground text-center">
                  <div>
                    <p>No detection points yet</p>
                    <p className="text-sm">Click 'Play Bag' and enable Detection Cloud</p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              LiDAR points inside detection bboxes · Drag to orbit · Scroll to zoom
            </div>
          </CardContent>
        </Card>)}

        <Card>
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>WebSocket:</strong> {ROS_WS_URL}</div>
            <div><strong>{STREAM_TYPE === 'h264' ? 'H.264' : 'MJPEG'} Stream:</strong> {STREAM_URL}</div>
            <div><strong>Camera Info Topic:</strong> /camera/color/camera_info</div>
            <div><strong>LiDAR Topic:</strong> /livox/filtered (sensor_msgs/PointCloud2)</div>
            <div><strong>Detection Topic:</strong> /livox/inbox_voxel (sensor_msgs/PointCloud2)</div>
            <div><strong>Detection BBox Topic:</strong> /detections/pixel (std_msgs/String)</div>
            <div><strong>Service:</strong> /ros_web_bridge_node/play_bag</div>
            <div><strong>Bag File:</strong> lvdata_2026-05-11-15-54-05.bag</div>
            <div className="pt-2">
              <strong>Active Subscriptions:</strong> {cameraInfoTopicRef.current ? 'Camera Info ✅' : 'Camera Info ❌'}{' · '}
              {filterTopicRef.current ? 'Filter Cloud ✅' : 'Filter Cloud ❌'}{' · '}
              {detectionTopicRef.current ? 'Detection Cloud ✅' : 'Detection Cloud ❌'}{' · '}
              {detectionsTopicRef.current ? 'Detection BBox ✅' : 'Detection BBox ❌'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;