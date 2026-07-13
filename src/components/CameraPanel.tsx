import { STREAM_URL, STREAM_TYPE } from '@/config';

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

const DETECTION_COLORS: Record<string, string> = {
  box: '#3b82f6',
  person: '#22c55e',
  pallet: '#ec4899',
  canvas: '#eab308',
};

interface CameraPanelProps {
  cameraInfo: { width: number; height: number } | null;
  detections: Detection[];
  showDetections: boolean;
  streamError: string | null;
  onStreamError: () => void;
}

export default function CameraPanel({ cameraInfo, detections, showDetections, streamError, onStreamError }: CameraPanelProps) {
  const overlayWidth = cameraInfo?.width || 1280;
  const overlayHeight = cameraInfo?.height || 720;
  const showOverlay = showDetections && detections.length > 0;

  const streamElement = STREAM_TYPE === 'h264' ? (
    <video
      src={STREAM_URL}
      className="camera-img"
      autoPlay
      muted
      playsInline
      onError={onStreamError}
    />
  ) : (
    <img
      src={STREAM_URL}
      alt="Camera Stream"
      className="camera-img"
      onError={onStreamError}
    />
  );

  return (
    <div className="camera-view">
      <div className="camera-frame">
        {streamError ? (
          <div className="camera-placeholder">
            <div className="placeholder-icon">⚠️</div>
            <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>Stream Error</div>
            <div className="placeholder-sub">{streamError}</div>
          </div>
        ) : (
          <>
            {streamElement}
            {showOverlay && (
              <svg
                viewBox={`0 0 ${overlayWidth} ${overlayHeight}`}
                className="detection-overlay"
                preserveAspectRatio="xMidYMid meet"
              >
                {detections.map((det, i) => {
                  const [xmin, ymin, xmax, ymax] = det.bbox;
                  const color = DETECTION_COLORS[det.class_name] ?? '#3b82f6';
                  return (
                    <g key={i}>
                      <rect
                        x={xmin}
                        y={ymin}
                        width={xmax - xmin}
                        height={ymax - ymin}
                        fill="none"
                        stroke={color}
                        strokeWidth={Math.max(2, overlayWidth / 400)}
                      />
                      <text
                        x={xmin}
                        y={ymin - 4}
                        fill={color}
                        fontSize={Math.max(12, overlayWidth / 80)}
                        fontWeight="bold"
                      >
                        {det.class_name} {(det.confidence * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </>
        )}
      </div>
    </div>
  );
}
