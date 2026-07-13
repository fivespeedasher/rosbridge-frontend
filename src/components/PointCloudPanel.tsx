import { useState } from 'react';
import PointCloudView, { type PointCloudFrame } from './PointCloudView';

interface PointCloudPanelProps {
  title: string;
  titleEn?: string;
  frame: PointCloudFrame | null;
  stats: { count: number; frameId: string } | null;
  defaultPointSize?: number;
  active: boolean;
}

export default function PointCloudPanel({ title, titleEn, frame, stats, defaultPointSize = 0.05, active }: PointCloudPanelProps) {
  const [pointSize, setPointSize] = useState(defaultPointSize);

  return (
    <div className="panel pointcloud-panel">
      <div className="panel-header">
        <span className="panel-icon">🌐</span>
        <span>{title}</span>
        {titleEn && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{titleEn}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="point-size-control" style={{ marginLeft: 0 }}>
            <span className="size-label">点径</span>
            <input
              type="range"
              min="0.005"
              max="0.2"
              step="0.005"
              value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              className="size-slider"
            />
            <span className="size-value">{pointSize.toFixed(3)}</span>
          </div>
          {stats && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {stats.count.toLocaleString()} pts
            </span>
          )}
        </div>
      </div>
      <div className="panel-body p-0" style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {active ? (
          <PointCloudView frame={frame} pointSize={pointSize} />
        ) : (
          <div className="camera-placeholder">
            <div className="placeholder-icon">🌐</div>
            <div>等待数据...</div>
            <div className="placeholder-sub">Waiting for data...</div>
          </div>
        )}
      </div>
    </div>
  );
}
