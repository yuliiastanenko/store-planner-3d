import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getItem } from '../data/catalog';
import { footprint, type Fixture } from '../lib/layout';
import { usePlannerStore } from '../store/usePlannerStore';

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

interface Props {
  fixture: Fixture;
  colliding: boolean;
}

export function FixtureMesh({ fixture, colliding }: Props) {
  const item = getItem(fixture.type);
  const { w, d, h } = item.size;
  const selected = usePlannerStore((s) => s.selectedId === fixture.id);
  const dragging = usePlannerStore((s) => s.draggingId === fixture.id);
  const { beginDrag, endDrag, moveTo, select } = usePlannerStore.getState();
  const offset = useRef({ x: 0, z: 0 });

  const color = colliding ? '#e5484d' : item.color;
  const fp = footprint(item.size, fixture.rotation);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (e.ray.intersectPlane(FLOOR, hit)) offset.current = { x: hit.x - fixture.x, z: hit.z - fixture.z };
    beginDrag(fixture.id);
    select(fixture.id);
  };
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    if (e.ray.intersectPlane(FLOOR, hit)) moveTo(fixture.id, hit.x - offset.current.x, hit.z - offset.current.z);
  };
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    endDrag();
  };

  const material = useMemo(() => ({ color, roughness: 0.7 }), [color]);

  return (
    <group position={[fixture.x, 0, fixture.z]}>
      {/* Footprint marker on floor (in world axes, so uses rotated footprint) */}
      {(selected || colliding) && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
          <planeGeometry args={[fp.w + 0.1, fp.d + 0.1]} />
          <meshBasicMaterial color={colliding ? '#e5484d' : '#2f81f7'} transparent opacity={0.25} />
        </mesh>
      )}

      <group
        rotation-y={(-fixture.rotation * Math.PI) / 180}
        position-y={dragging ? 0.05 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <Shape shape={item.shape} w={w} d={d} h={h} material={material} />
        {selected && (
          <mesh position-y={h / 2}>
            <boxGeometry args={[w + 0.04, h + 0.04, d + 0.04]} />
            <meshBasicMaterial color="#2f81f7" wireframe />
          </mesh>
        )}
      </group>

      {selected && (
        <Html position={[0, h + 0.35, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div className="tag">
            {item.label} · {fp.w}×{fp.d} m
          </div>
        </Html>
      )}
    </group>
  );
}

type Mat = { color: string; roughness: number };

function Shape({ shape, w, d, h, material }: { shape: string; w: number; d: number; h: number; material: Mat }) {
  const m = <meshStandardMaterial {...material} />;
  switch (shape) {
    case 'shelf': {
      const boards = 4;
      return (
        <group>
          <mesh castShadow position={[0, h / 2, -d / 2 + 0.03]}>
            <boxGeometry args={[w, h, 0.06]} />
            {m}
          </mesh>
          {Array.from({ length: boards }, (_, i) => (
            <mesh key={i} castShadow receiveShadow position={[0, 0.1 + (i * (h - 0.15)) / (boards - 1), 0]}>
              <boxGeometry args={[w, 0.04, d]} />
              {m}
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[(s * (w - 0.04)) / 2, h / 2, 0]}>
              <boxGeometry args={[0.04, h, d]} />
              {m}
            </mesh>
          ))}
        </group>
      );
    }
    case 'table':
      return (
        <group>
          <mesh castShadow receiveShadow position-y={h - 0.03}>
            <boxGeometry args={[w, 0.06, d]} />
            {m}
          </mesh>
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz]) => (
            <mesh key={`${sx}${sz}`} castShadow position={[(sx * (w - 0.1)) / 2, (h - 0.06) / 2, (sz * (d - 0.1)) / 2]}>
              <boxGeometry args={[0.06, h - 0.06, 0.06]} />
              {m}
            </mesh>
          ))}
        </group>
      );
    case 'rack':
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[(s * w) / 2, h / 2, 0]}>
              <cylinderGeometry args={[0.025, 0.025, h, 8]} />
              <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          <mesh position-y={h - 0.05} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.02, 0.02, w, 8]} />
            <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} castShadow position={[-w / 2 + 0.2 + (i * (w - 0.4)) / 5, h - 0.5, 0]}>
              <boxGeometry args={[0.06, 0.8, d * 0.9]} />
              {m}
            </mesh>
          ))}
        </group>
      );
    case 'mannequin':
      return (
        <group>
          <mesh receiveShadow position-y={0.02}>
            <cylinderGeometry args={[w / 2, w / 2, 0.04, 24]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh castShadow position-y={h * 0.55}>
            <capsuleGeometry args={[0.15, h * 0.55, 4, 12]} />
            {m}
          </mesh>
          <mesh castShadow position-y={h - 0.12}>
            <sphereGeometry args={[0.11, 16, 16]} />
            {m}
          </mesh>
        </group>
      );
    case 'checkout':
      return (
        <group>
          <mesh castShadow receiveShadow position-y={h / 2}>
            <boxGeometry args={[w, h, d]} />
            {m}
          </mesh>
          <mesh castShadow position={[w / 4, h + 0.18, 0]} rotation-x={-0.3}>
            <boxGeometry args={[0.35, 0.25, 0.03]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh castShadow position-y={h / 2}>
          <boxGeometry args={[w, h, d]} />
          {m}
        </mesh>
      );
  }
}
