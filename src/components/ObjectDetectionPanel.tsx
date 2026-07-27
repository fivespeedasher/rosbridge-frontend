import { useState } from 'react';

interface ObjectDetectionPanelProps {
  connected: boolean;
  closestDistances: Array<{ class_name: string; distance: number }>;
}

/**
 * 目标检测面板 / Object Detection Panel
 * Shows per-class closest distances from LiDAR.
 */
export default function ObjectDetectionPanel({
  connected,
  closestDistances,
}: ObjectDetectionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="panel objdet-panel">
      <div className="panel-header">
        <span className="panel-icon">🎯</span>
        <span>目标检测</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Objects</span>
        {closestDistances.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {closestDistances.length} class{closestDistances.length > 1 ? 'es' : ''}
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
        <div className="panel-body">
          {closestDistances.length > 0 ? (
            <div className="objdet-list">
              {closestDistances.map((obj) => (
                <div key={obj.class_name} className="objdet-row">
                  <span className="objdet-class">{obj.class_name}</span>
                  <span className="objdet-distance">{obj.distance.toFixed(2)} m</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="objdet-empty">
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
