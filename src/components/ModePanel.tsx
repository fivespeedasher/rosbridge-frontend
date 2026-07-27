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
  // Multi-device playback
  playbackState: 'idle' | 'playing';
  ownerDeviceId: string;
  deviceId: string;
  playLoading: boolean;
  bagPath?: string;
  onBagPathChange?: (v: string) => void;
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
  playbackState,
  ownerDeviceId,
  deviceId,
  playLoading,
  bagPath,
  onBagPathChange,
}: ModePanelProps) {
  const isOwnPlayback =
    playbackState === 'playing' && ownerDeviceId === deviceId;
  const isOtherPlayback =
    playbackState === 'playing' && ownerDeviceId !== deviceId;

  return (
    <div className="panel mode-panel">
      <div className="panel-header">
        <span className="panel-icon">⚙️</span>
        <span>运行模式</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Mode</span>
      </div>
      <div className="panel-body">
        {mode === 'idle' && !isOtherPlayback ? (
          /* Idle: show mode selection */
          <>
            {/* Bag path input */}
            {bagPath !== undefined && onBagPathChange && (
              <div className="bag-path-row">
                <label className="bag-path-label">Bag 文件路径</label>
                <input
                  type="text"
                  className="bag-path-input"
                  value={bagPath}
                  onChange={(e) => onBagPathChange(e.target.value)}
                  placeholder="/path/to/file.bag"
                />
              </div>
            )}
            <div className="mode-btn-group">
              <button
                className="btn btn-sm btn-primary btn-mode"
                onClick={onPlayBag}
                disabled={!connected || playLoading}
              >
                {playLoading ? '...' : '▶ 播放 Bag'}
              </button>
              <button
                className="btn btn-sm btn-primary btn-mode"
                onClick={onGoOnline}
                disabled={!connected}
              >
                ● 在线模式
              </button>
            </div>
          </>
        ) : (
          /* Active mode */
          <>
            {isOtherPlayback && (
              <div className="bag-playing-info">
                <span className="playing-indicator" />
                <span>其他设备播放中</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  {ownerDeviceId.slice(0, 8)}…
                </span>
              </div>
            )}
            <div className="mode-btn-group">
              {mode === 'bag' && (
                <button
                  className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'} btn-mode`}
                  onClick={isPlaying ? onStopBag : onPlayBag}
                  disabled={playLoading}
                >
                  {playLoading ? '...' : (isPlaying ? '⏹ 停止' : '▶ 播放')}
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
                🎯 显示检测框 / Detection BBox
              </span>
            </div>

            {/* Playing indicator */}
            {mode === 'bag' && isOwnPlayback && (
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
