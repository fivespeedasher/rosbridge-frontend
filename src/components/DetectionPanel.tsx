/**
 * 车厢尺寸检测面板 / Wagon Dimension Detection Panel
 * Shows detection results in a table. Placeholder when no data.
 */
export default function DetectionPanel() {
  // Placeholder — no wagon detection data from our ROS topics yet
  return (
    <div className="detection-panel-wrapper">
      <div className="detection-panel-header">
        <span className="panel-icon">📐</span>
        <span>车厢尺寸检测</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Dimensions</span>
        <span className="panel-badge">0</span>
      </div>
      <div className="detection-panel-body">
        <table className="detection-table">
          <thead>
            <tr>
              <th>车厢长 (m)</th>
              <th>车厢宽 (m)</th>
              <th>车厢高 (m)</th>
              <th>前端宽 (m)</th>
              <th>前端高 (m)</th>
              <th>左边距 (m)</th>
              <th>右边距 (m)</th>
              <th>朝向 (°)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="empty-row">
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
              <td><span className="placeholder-val">—</span></td>
            </tr>
            <tr className="empty-row">
              <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                📭 暂无数据，等待 ROS 消息...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
