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
  detectionFrame: PointCloudFrame | null;
  detectionStats: { count: number; frameId: string } | null;
  streamActive: boolean;
  // Actions
  onPlayBag: () => void;
  onStopBag: () => void;
  onGoOnline: () => void;
  onBackToIdle: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleDetectionCloud: (v: boolean) => void;
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
  detectionFrame,
  detectionStats,
  streamActive,
  onPlayBag,
  onStopBag,
  onGoOnline,
  onBackToIdle,
  onConnect,
  onDisconnect,
  onToggleDetectionCloud,
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
            showDetectionCloud={showDetectionCloud}
            detectionFrame={detectionFrame}
            detectionStats={detectionStats}
            streamActive={streamActive}
          />
        </div>
      </div>
    </div>
  );
}
