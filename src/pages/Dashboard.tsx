import ConnectionPanel from '@/components/ConnectionPanel';
import ModePanel from '@/components/ModePanel';
import CameraPanel from '@/components/CameraPanel';
import PointCloudPanel from '@/components/PointCloudPanel';
import DetectionPanel from '@/components/DetectionPanel';
import ObjectDetectionPanel from '@/components/ObjectDetectionPanel';
import type { PointCloudFrame } from '@/components/PointCloudView';

interface DashboardProps {
  // Connection
  connected: boolean;
  connecting: boolean;
  connectionError: string | null;
  // Mode
  mode: 'idle' | 'bag' | 'online';
  isPlaying: boolean;
  // Detection
  showDetectionCloud: boolean;
  // Camera
  cameraInfo: { width: number; height: number } | null;
  detections: Array<{ class_id: number; class_name: string; confidence: number; bbox: [number, number, number, number] }>;
  streamError: string | null;
  onStreamError: () => void;
  // Point cloud
  filterFrame: PointCloudFrame | null;
  filterStats: { count: number; frameId: string } | null;
  closestDistances: Array<{ class_name: string; distance: number }>;
  streamActive: boolean;
  // Multi-device playback
  playbackState: 'idle' | 'playing';
  ownerDeviceId: string;
  deviceId: string;
  playLoading: boolean;
  // Actions
  onPlayBag: () => void;
  onStopBag: () => void;
  onGoOnline: () => void;
  onBackToIdle: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleDetectionCloud: (v: boolean) => void;
  bagPath: string;
  onBagPathChange: (v: string) => void;
}

export default function Dashboard({
  connected,
  connecting,
  connectionError,
  mode,
  isPlaying,
  showDetectionCloud,
  cameraInfo,
  detections,
  streamError,
  onStreamError,
  filterFrame,
  filterStats,
  closestDistances,
  streamActive,
  playbackState,
  ownerDeviceId,
  deviceId,
  playLoading,
  onPlayBag,
  onStopBag,
  onGoOnline,
  onBackToIdle,
  onConnect,
  onDisconnect,
  onToggleDetectionCloud,
  bagPath,
  onBagPathChange,
}: DashboardProps) {
  return (
    <div className="dashboard">
      {/* 顶部: sidebar + 可视化 */}
      <div className="dashboard-top">
        <aside className="dashboard-sidebar">
          <ConnectionPanel
            connected={connected}
            connecting={connecting}
            connectionError={connectionError}
            mode={mode}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
          <ModePanel
            mode={mode}
            isPlaying={isPlaying}
            connected={connected}
            showDetectionCloud={showDetectionCloud}
            onPlayBag={onPlayBag}
            onStopBag={onStopBag}
            onGoOnline={onGoOnline}
            onBackToIdle={onBackToIdle}
            onToggleDetectionCloud={onToggleDetectionCloud}
            bagPath={bagPath}
            onBagPathChange={onBagPathChange}
            playbackState={playbackState}
            ownerDeviceId={ownerDeviceId}
            deviceId={deviceId}
            playLoading={playLoading}
          />
        </aside>
        <main className="dashboard-main">
          <div className="viz-row">
            {/* Camera Column */}
            <div className="viz-col">
              <div className="section-header">
                <span className="section-icon">📷</span>
                <span>视觉图像</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>/camera/color/image_raw</span>
                {cameraInfo && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {cameraInfo.width}×{cameraInfo.height}
                  </span>
                )}
              </div>
              <div className="section-body fill">
                <CameraPanel
                  cameraInfo={cameraInfo}
                  detections={detections}
                  showDetections={showDetectionCloud}
                  streamError={streamError}
                  onStreamError={onStreamError}
                />
              </div>
            </div>
            {/* Point Cloud — Filter Cloud only, centered */}
            <div className="viz-col">
              <PointCloudPanel
                title="LiDAR 点云"
                titleEn="/livox/filtered"
                frame={filterFrame}
                stats={filterStats}
                active={streamActive}
              />
            </div>
          </div>
        </main>
      </div>

      {/* 底部: 车厢尺寸检测 | 目标检测 */}
      <div className="dashboard-bottom">
        <div className="bottom-col">
          <DetectionPanel />
        </div>
        <div className="bottom-col">
          <ObjectDetectionPanel
            connected={connected}
            closestDistances={closestDistances}
          />
        </div>
      </div>
    </div>
  );
}
