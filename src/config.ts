/**
 * ROS connection configuration.
 *
 * By default, ROS host is auto-detected from the browser's current page URL
 * (so the UI works from any LAN address without rebuilding).
 * Override via VITE_ROS_HOST env var if needed.
 */

export type StreamType = 'mjpeg' | 'h264';

function getRosHost(): string {
  // Allow explicit override via env var
  if (import.meta.env.VITE_ROS_HOST) {
    return import.meta.env.VITE_ROS_HOST;
  }
  // Auto-detect: use the host that served the page (works across LAN)
  return window.location.hostname;
}

const ROS_HOST = getRosHost();
const ROS_WS_PORT = import.meta.env.VITE_ROS_WS_PORT || '9092';
const STREAM_PORT = import.meta.env.VITE_STREAM_PORT || '9093';
const STREAM_TOPIC = '/camera/color/image_raw';
const STREAM_QUALITY = import.meta.env.VITE_STREAM_QUALITY || '65';

/**
 * Which stream type to use.
 * - 'mjpeg' → displayed via <img> tag
 * - 'h264'  → displayed via <video> tag (fragmented MP4 from web_video_server)
 *
 * Set VITE_STREAM_TYPE env var to override (default: 'mjpeg').
 * When the server's web_video_server node has default_stream_type=h264,
 * set VITE_STREAM_TYPE=h264.
 */
export const STREAM_TYPE: StreamType =
  (import.meta.env.VITE_STREAM_TYPE as StreamType) || 'mjpeg';

export const ROS_WS_URL = `ws://${ROS_HOST}:${ROS_WS_PORT}`;
export const STREAM_URL = `http://${ROS_HOST}:${STREAM_PORT}/stream?topic=${STREAM_TOPIC}&quality=${STREAM_QUALITY}&type=${STREAM_TYPE}`;