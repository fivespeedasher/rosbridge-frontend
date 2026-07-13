import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { TrackballControls as TrackballControlsImpl } from 'three/examples/jsm/controls/TrackballControls.js';
import * as THREE from 'three';
import { rangeOf } from '@/lib/pointcloud2';

export interface PointCloudFrame {
  /** Flat [x0,y0,z0, ...] positions. */
  positions: Float32Array;
  /** Per-point intensity. */
  intensities: Float32Array;
  count: number;
  frameId: string;
}

interface PointsProps {
  frame: PointCloudFrame | null;
  pointSize?: number;
}

/**
 * Renders a single frame of the point cloud as a THREE.Points mesh, colored
 * per-point by intensity (low → dark blue, high → bright yellow, a simple
 * "turbo-ish" gradient). Geometry is rebuilt whenever a new frame arrives.
 */
function Points({ frame, pointSize = 0.05 }: PointsProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, []);

  // Update material point size when prop changes.
  useEffect(() => {
    material.size = pointSize;
  }, [pointSize, material]);

  // Rebuild geometry + per-point colors whenever the frame changes.
  useEffect(() => {
    if (!frame || frame.count === 0) {
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
      geometry.computeBoundingSphere();
      return;
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(frame.positions, 3)
    );

    // Map intensity → RGB. Normalizing by the in-frame [min,max] keeps every
    // frame visually legible regardless of absolute reflectance scale.
    const [min, max] = rangeOf(frame.intensities);
    const span = max - min || 1;
    const colors = new Float32Array(frame.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < frame.count; i++) {
      const t = (frame.intensities[i] - min) / span; // 0..1
      // Dark blue → cyan → green → yellow gradient.
      c.setHSL(0.66 * (1 - t), 0.9, 0.35 + 0.35 * t);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
  }, [frame, geometry]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

/**
 * TrackballControls wrapper — no polar/azimuth limits, so you get full
 * unrestricted 360° rotation in any direction. No gimbal lock.
 *
 * Also auto-fits the camera to the cloud's bounding sphere on the first
 * frame, then leaves control to the user.
 */
function TrackballCamera({ frame }: { frame: PointCloudFrame | null }) {
  const controlsRef = useRef<TrackballControlsImpl | null>(null);
  const fittedRef = useRef(false);
  const { camera, gl } = useThree();

  // Create TrackballControls when the canvas mounts
  useEffect(() => {
    const controls = new TrackballControlsImpl(camera, gl.domElement);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noRotate = false;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.1;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  // Auto-fit to the cloud's bounding sphere on the first frame
  useEffect(() => {
    if (fittedRef.current) return;
    if (!frame || frame.count === 0 || !controlsRef.current) return;
    fittedRef.current = true;

    const pos = frame.positions;
    const n = frame.count;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += pos[i * 3];
      cy += pos[i * 3 + 1];
      cz += pos[i * 3 + 2];
    }
    cx /= n; cy /= n; cz /= n;
    let radiusSq = 0;
    for (let i = 0; i < n; i++) {
      const dx = pos[i * 3] - cx;
      const dy = pos[i * 3 + 1] - cy;
      const dz = pos[i * 3 + 2] - cz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d > radiusSq) radiusSq = d;
    }
    const radius = Math.sqrt(radiusSq) || 1;

    const dist = radius * 2.2 + 1;
    const target = new THREE.Vector3(cx, cy, cz);
    camera.position.set(cx + dist, cy + dist, cz + dist);
    controlsRef.current.target.copy(target);
    controlsRef.current.update();
  }, [frame, camera]);

  // Tick the controls every frame for damping
  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

export interface PointCloudViewProps {
  frame: PointCloudFrame | null;
  /** Height of the canvas in pixels. If omitted, fills the parent container. */
  height?: number;
  /** Point size. Default 0.05. */
  pointSize?: number;
}

/**
 * 3D, draggable point cloud viewer. Left-drag orbits, right-drag pans,
 * scroll zooms. The cloud auto-fits to the view on the first frame.
 */
export default function PointCloudView({ frame, height, pointSize = 0.05 }: PointCloudViewProps) {
  const style: React.CSSProperties = height
    ? { width: '100%', height, overflow: 'hidden', background: '#111622' }
    : { position: 'absolute', inset: 0, overflow: 'hidden', background: '#111622' };

  return (
    <div style={style}>
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 10000, position: [10, 10, 10] }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.6} />
        <Points frame={frame} pointSize={pointSize} />
        {/* Origin axes (sensor frame): X red, Y green, Z blue. */}
        <axesHelper args={[1]} />
        <TrackballCamera frame={frame} />
      </Canvas>
    </div>
  );
}