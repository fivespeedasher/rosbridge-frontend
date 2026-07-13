import { useEffect, useState } from 'react';
import { ROS_WS_URL } from '@/config';

interface StatusBarProps {
  mode: 'idle' | 'bag' | 'online';
  connected: boolean;
  connectionError: string | null;
  serviceResult?: { success: boolean; timestamp: Date } | null;
  activeTopics?: number;
}

export default function StatusBar({ connected, connectionError, serviceResult, activeTopics = 0 }: StatusBarProps) {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <footer className="status-bar">
      <div className="status-left">
        <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        <span>{connected ? '已连接' : '未连接'}</span>
        {connected && (
          <>
            <span className="status-divider">|</span>
            <span>WebSocket: {ROS_WS_URL}</span>
            <span className="status-divider">|</span>
            <span>📡 Topics: {activeTopics}</span>
          </>
        )}
        {serviceResult && (
          <>
            <span className="status-divider">|</span>
            <span>
              Service: {serviceResult.success ? '✓' : '✗'} {Math.round((Date.now() - serviceResult.timestamp.getTime()) / 1000)}s ago
            </span>
          </>
        )}
      </div>
      <div className="status-right">
        {connectionError && (
          <>
            <span className="status-error" title={connectionError}>
              ⚠️ {connectionError}
            </span>
            <span className="status-divider">|</span>
          </>
        )}
        <span className="status-clock">
          {clock.getFullYear()}-{pad(clock.getMonth() + 1)}-{pad(clock.getDate())}{' '}
          {pad(clock.getHours())}:{pad(clock.getMinutes())}:{pad(clock.getSeconds())}
        </span>
      </div>
    </footer>
  );
}
