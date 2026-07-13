import { useState } from 'react';
import PointCloudView from './PointCloudView';
import type { PointCloudFrame } from './PointCloudView';

interface ObjectDetectionPanelProps {
  connected: boolean;
  showDetectionCloud: boolean;
  detectionFrame: PointCloudFrame | null;
  detectionStats: { count: number; frameId: string } | null;
  streamActive: boolean;
}

/**
 * 目标检测面板 / Object Detection Panel
 * Shows detection cloud viewer when enabled, placeholder otherwise.
 */
export default function ObjectDetectionPanel({
  connected,
  showDetectionCloud,
  detectionFrame,
  detectionStats,
  streamActive,
}: ObjectDetectionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="panel objdet-panel">
      <div className="panel-header">
        <span className="panel-icon">🎯</span>
        <span>目标检测</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Objects</span>
        {showDetectionCloud && detectionStats && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {detectionStats.count.toLocaleString()} pts
          </span>
        )}
        <button
          className="btn-collapse"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开 / Expand' : '收起 / Collapse'}
        >
          {collapsed ? '◀' : '▼'}
        </button>
      </div>
      {!collapsed && (
        <div className="panel-body p-0">
          {showDetectionCloud && streamActive ? (
            <PointCloudView frame={detectionFrame} height={200} pointSize={0.2} showLabels />
          ) : (
            <div className="objdet-empty">
              <div className="objdet-empty-icon">📡</div>
              <div>
                {connected ? '等待目标检测数据...' : 'ROS 未连接'}
              </div>
              <div className="objdet-empty-sub">
                {connected ? 'Waiting for object detection data...' : 'ROS not connected'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
