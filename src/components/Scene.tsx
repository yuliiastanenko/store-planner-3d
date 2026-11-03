import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { sizeOf } from '../data/catalog';
import { findCollisions } from '../lib/layout';
import { usePlannerStore } from '../store/usePlannerStore';
import { FixtureMesh } from './FixtureMesh';

function Room() {
  const room = usePlannerStore((s) => s.room);
  const select = usePlannerStore((s) => s.select);
  const wallH = 2.6;
  const t = 0.1;
  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          select(null);
        }}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color="#efeae2" />
      </mesh>
      <Grid
        position-y={0.002}
        args={[room.width, room.depth]}
        cellSize={0.25}
        sectionSize={1}
        cellColor="#d6cfc4"
        sectionColor="#b9ae9e"
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={60}
      />
      {/* Back and left walls only, so the camera can always see in */}
      <mesh position={[0, wallH / 2, -room.depth / 2 - t / 2]} receiveShadow>
        <boxGeometry args={[room.width + 2 * t, wallH, t]} />
        <meshStandardMaterial color="#f7f4ef" />
      </mesh>
      <mesh position={[-room.width / 2 - t / 2, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[t, wallH, room.depth]} />
        <meshStandardMaterial color="#f7f4ef" />
      </mesh>
      {/* Entrance marker */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, room.depth / 2 - 0.15]}>
        <planeGeometry args={[2, 0.3]} />
        <meshBasicMaterial color="#2f81f7" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Smoothly moves the camera between perspective and top-down plan view. */
function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const view = usePlannerStore((s) => s.view);
  const room = usePlannerStore((s) => s.room);
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const animating = useRef(true);

  useEffect(() => {
    const dist = Math.max(room.width, room.depth);
    if (view === 'top') target.set(0, dist * 1.35, 0.01);
    else target.set(dist * 0.55, dist * 0.75, dist * 0.95);
    animating.current = true;
  }, [view, room, target]);

  useFrame((_, dt) => {
    if (!animating.current) return;
    // Frame-rate independent easing; snap exactly at the end so plan view is axis-aligned.
    camera.position.lerp(target, 1 - Math.exp(-8 * Math.min(dt, 0.1)));
    if (camera.position.distanceTo(target) < 0.05) {
      camera.position.copy(target);
      animating.current = false;
    }
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  });
  return null;
}

export function Scene() {
  const fixtures = usePlannerStore((s) => s.fixtures);
  const dragging = usePlannerStore((s) => s.draggingId);
  const view = usePlannerStore((s) => s.view);
  const collisions = useMemo(() => findCollisions(fixtures, sizeOf), [fixtures]);
  const controls = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      shadows
      camera={{ position: [8, 10, 12], fov: 45 }}
      aria-label="3D store floor plan. Use the fixture list and keyboard shortcuts for non-pointer access."
      role="img"
    >
      <color attach="background" args={['#dfe5ec']} />
      <hemisphereLight args={['#ffffff', '#c9c2b8', 0.7]} />
      <directionalLight
        castShadow
        position={[6, 12, 6]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Room />
      {fixtures.map((f) => (
        <FixtureMesh key={f.id} fixture={f} colliding={collisions.has(f.id)} />
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!dragging}
        enableRotate={view === '3d'}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={4}
        maxDistance={30}
      />
      <CameraRig controls={controls} />
    </Canvas>
  );
}
