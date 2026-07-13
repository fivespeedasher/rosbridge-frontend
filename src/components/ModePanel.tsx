interface ModePanelProps {
  mode: 'idle' | 'bag' | 'online';
  isPlaying: boolean;
  connected: boolean;
  showDetectionCloud: boolean;
  onPlayBag: () => void;
  onStopBag: () => void;
  onGoOnline: () => void;
  onBackToIdle: () => void;
  onToggleDetectionCloud: (v: boolean) => void;
}

export default function ModePanel({
  mode,
  isPlaying,
  connected,
  showDetectionCloud,
  onPlayBag,
  onStopBag,
  onGoOnline,
  onBackToIdle,
  onToggleDetectionCloud,
}: ModePanelProps) {
  return (
    <div className="panel mode-panel">
      <div className="panel-header">
        <span className="panel-icon">⚙️</span>
        <span>运行模式</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Mode</span>
      </div>
      <div className="panel-body">
        {mode === 'idle' ? (
          /* Idle: show mode selection */
          <div className="mode-btn-group">
            <button
              className="btn btn-sm btn-primary btn-mode"
              onClick={onPlayBag}
              disabled={!connected}
            >
              ▶ 播放 Bag
            </button>
            <button
              className="btn btn-sm btn-primary btn-mode"
              onClick={onGoOnline}
              disabled={!connected}
            >
              ● 在线模式
            </button>
          </div>
        ) : (
          /* Active mode */
          <>
            <div className="mode-btn-group">
              {mode === 'bag' && (
                <button
                  className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'} btn-mode`}
                  onClick={isPlaying ? onStopBag : onPlayBag}
                >
                  {isPlaying ? '⏹ 停止' : '▶ 播放'}
                </button>
              )}
              <button
                className="btn btn-sm btn-secondary btn-mode"
                onClick={onBackToIdle}
              >
                ← 返回待命
              </button>
            </div>

            <div className="bag-divider" />

            {/* Detection cloud toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="mode-switch-sm">
                <input
                  type="checkbox"
                  checked={showDetectionCloud}
                  onChange={(e) => onToggleDetectionCloud(e.target.checked)}
                />
                <span className="switch-slider-sm" />
              </label>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                🎯 检测点云 / Detection Cloud
              </span>
            </div>

            {/* Playing indicator */}
            {mode === 'bag' && isPlaying && (
              <div className="bag-playing-info">
                <span className="playing-indicator" />
                <span>播放中 / Playing</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
