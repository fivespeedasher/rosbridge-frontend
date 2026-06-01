import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ros, Topic, Service } from 'roslib';

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

// web_video_server MJPEG stream URL
const MJPEG_STREAM_URL = 'http://localhost:9093/stream?topic=/camera/color/image_raw';

function App() {
  const [ros, setRos] = useState<Ros | null>(null);
  const [status, setStatus] = useState<ROSStatus>({ connected: false });
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const cameraInfoTopicRef = useRef<Topic | null>(null);
  const serviceRef = useRef<Service | null>(null);

  // Connect to ROS bridge
  useEffect(() => {
    console.log('Attempting to connect to ROS bridge at ws://localhost:9092');
    const rosInstance = new Ros({
      url: 'ws://localhost:9092'
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
      rosInstance.close();
    };
  }, []);

  // Subscribe to topics when connected
  useEffect(() => {
    if (!ros || !status.connected) return;

    try {
      // Set up camera info topic
      const cameraInfoTopic = new Topic({
        ros: ros,
        name: '/camera/color/camera_info',
        messageType: 'sensor_msgs/CameraInfo'
      });

      cameraInfoTopic.subscribe((message: any) => {
        // Extract width, height, and distortion model from CameraInfo
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

      // Set up service
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

  const handlePlay = () => {
    callService(true);
    setStreamActive(true);
    setStreamError(null);
  };

  const handleStop = () => {
    callService(false);
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
    setStreamError('Stream unavailable — is web_video_server running on port 9093?');
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
            <CardTitle>Bag Playback Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handlePlay}
                disabled={!status.connected}
                className="bg-green-600 hover:bg-green-700"
              >
                Play Bag
              </Button>
              <Button
                onClick={handleStop}
                disabled={!status.connected}
                variant="destructive"
              >
                Stop Bag
              </Button>
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

        {/* MJPEG Camera Stream */}
        <Card>
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
                      <img
                        src={MJPEG_STREAM_URL}
                        alt="ROS Camera MJPEG Stream"
                        className="max-w-full max-h-96 object-contain rounded"
                        onError={handleStreamError}
                      />
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
        </Card>

        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>WebSocket:</strong> ws://localhost:9092</div>
            <div><strong>MJPEG Stream:</strong> http://localhost:9093/stream?topic=/camera/color/image_raw</div>
            <div><strong>Camera Info Topic:</strong> /camera/color/camera_info</div>
            <div><strong>Service:</strong> /ros_web_bridge_node/play_bag</div>
            <div><strong>Bag File:</strong> lvdata_2026-05-11-15-54-05.bag</div>
            <div className="pt-2">
              <strong>Active Subscriptions:</strong> {cameraInfoTopicRef.current ? 'Camera Info ✅' : 'Camera Info ❌'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;