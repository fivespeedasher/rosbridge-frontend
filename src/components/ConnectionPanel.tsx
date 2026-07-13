import { useState } from 'react';
import { ROS_WS_URL } from '@/config';

interface ConnectionPanelProps {
  connected: boolean;
  connecting: boolean;
  connectionError: string | null;
  mode: 'idle' | 'bag' | 'online';
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function ConnectionPanel({
  connected,
  connecting,
  connectionError,
  mode,
  onConnect,
  onDisconnect,
}: ConnectionPanelProps) {
  const [showUrl, setShowUrl] = useState(false);

  const modeLabel = mode === 'idle' ? '待命' : mode === 'bag' ? '数据包' : '在线';

  return (
    <div className="panel connection-panel">
      <div className="panel-header">
        <span className="panel-icon">🔌</span>
        <span>系统连接</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>System</span>
        {mode !== 'idle' && <span className="mode-indicator">{modeLabel}</span>}
      </div>
      <div className="panel-body">
        <div className="conn-compact">
          <div className="conn-status">
            <div className={`status-dot ${connecting ? 'connecting' : connected ? 'connected' : 'disconnected'}`} />
            <span>
              {connecting ? '连接中...' : connected ? '已连接' : '未连接'}
            </span>
            <button className="btn-link conn-toggle-url" onClick={() => setShowUrl(!showUrl)}>
              {showUrl ? '▼' : '▶'}
            </button>
          </div>
          <button
            className={`btn btn-sm ${connected ? 'btn-danger' : 'btn-primary'}`}
            onClick={connected ? onDisconnect : onConnect}
            disabled={connecting}
          >
            {connecting ? '连接中...' : connected ? '断开' : '连接'}
          </button>
        </div>

        {showUrl && (
          <div className="conn-field">
            <div className="conn-input-row">
              <code className="conn-url">{ROS_WS_URL}</code>
            </div>
          </div>
        )}

        {connectionError && (
          <div style={{ fontSize: 12, color: 'var(--danger)', padding: '4px 0' }}>
            ⚠️ {connectionError}
          </div>
        )}
      </div>
    </div>
  );
}
