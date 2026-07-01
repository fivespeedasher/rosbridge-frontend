/**
 * Decoder for sensor_msgs/PointCloud2 messages (as delivered by roslibjs).
 *
 * PointCloud2 lays out point data in a flat byte buffer. Each point occupies
 * `point_step` bytes; within a point, named fields sit at fixed offsets with a
 * declared datatype. For the Livox bag we decode x/y/z (FLOAT32 @ offsets
 * 0/4/8) and intensity (FLOAT32 @ offset 12), but the decoder is field-driven
 * rather than hardcoded so it generalizes to other clouds.
 *
 * Reference: http://docs.ros.org/en/api/sensor_msgs/html/msg/PointCloud2.html
 * PointField datatype constants:
 *   1 INT8   2 UINT8   3 INT16   4 UINT16   5 INT32   6 UINT32
 *   7 FLOAT32   8 FLOAT64
 */

// Mirror of sensor_msgs/PointField as roslibjs delivers it.
export interface PointField {
  name: string;
  offset: number;
  datatype: number;
  count: number;
}

// Mirror of sensor_msgs/PointCloud2 as roslibjs delivers it.
// `data` arrives as a base64 string or a typed array depending on rosbridge
// config; roslibjs decodes base64 into a Uint8Array for us in binary mode.
export interface PointCloud2 {
  header: { frame_id: string };
  height: number;
  width: number;
  fields: PointField[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  data: Uint8Array | string | number[];
  is_dense: boolean;
}

export interface DecodedCloud {
  /** Flat [x0,y0,z0, x1,y1,z1, ...] positions (Float32Array, length = count*3). */
  positions: Float32Array;
  /** Per-point intensity (Float32Array, length = count). */
  intensities: Float32Array;
  count: number;
  frameId: string;
}

/** PointField datatype constants. */
const PF_FLOAT32 = 7;
const PF_FLOAT64 = 8;

/** Read a single FLOAT32 or FLOAT64 field value from a DataView. */
function readScalar(
  view: DataView,
  byteOffset: number,
  datatype: number,
  littleEndian: boolean
): number {
  switch (datatype) {
    case PF_FLOAT32:
      return view.getFloat32(byteOffset, littleEndian);
    case PF_FLOAT64:
      return view.getFloat64(byteOffset, littleEndian);
    default:
      // Non-float fields aren't decoded here; x/y/z/intensity are floats.
      return 0;
  }
}

/**
 * Decode a PointCloud2 message into flat typed arrays suitable for a
 * three.js BufferGeometry. Returns an empty result if the required fields
 * (x, y, z) are absent or the buffer is malformed.
 */
export function decodePointCloud2(msg: PointCloud2): DecodedCloud {
  const frameId = msg.header?.frame_id ?? '';

  // Normalize `data` to a Uint8Array. roslibjs with binary support hands us a
  // Uint8Array directly; otherwise it may arrive as a base64 string.
  let bytes: Uint8Array;
  if (msg.data instanceof Uint8Array) {
    bytes = msg.data;
  } else if (typeof msg.data === 'string') {
    bytes = base64ToUint8(msg.data);
  } else if (Array.isArray(msg.data)) {
    bytes = Uint8Array.from(msg.data);
  } else {
    return { positions: new Float32Array(0), intensities: new Float32Array(0), count: 0, frameId };
  }

  const littleEndian = !msg.is_bigendian;
  const pointStep = msg.point_step;
  const totalPoints = (msg.height || 1) * (msg.width || 0);

  if (pointStep <= 0 || totalPoints <= 0 || bytes.length < pointStep * totalPoints) {
    return { positions: new Float32Array(0), intensities: new Float32Array(0), count: 0, frameId };
  }

  // Locate field offsets by name.
  const find = (name: string): PointField | undefined =>
    msg.fields.find((f) => f.name === name);

  const xField = find('x');
  const yField = find('y');
  const zField = find('z');
  const iField = find('intensity');
  if (!xField || !yField || !zField) {
    return { positions: new Float32Array(0), intensities: new Float32Array(0), count: 0, frameId };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const positions = new Float32Array(totalPoints * 3);
  const intensities = new Float32Array(totalPoints);

  for (let p = 0; p < totalPoints; p++) {
    const base = p * pointStep;
    positions[p * 3 + 0] = readScalar(view, base + xField.offset, xField.datatype, littleEndian);
    positions[p * 3 + 1] = readScalar(view, base + yField.offset, yField.datatype, littleEndian);
    positions[p * 3 + 2] = readScalar(view, base + zField.offset, zField.datatype, littleEndian);
    intensities[p] = iField
      ? readScalar(view, base + iField.offset, iField.datatype, littleEndian)
      : 0;
  }

  return { positions, intensities, count: totalPoints, frameId };
}

/** Compute [min, max] of an array, ignoring NaN. Returns [0,0] for empty input. */
export function rangeOf(arr: Float32Array): [number, number] {
  if (arr.length === 0) return [0, 0];
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 0];
  return [min, max];
}

/** Minimal base64 → Uint8Array decoder (avoids relying on atob edge cases). */
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
