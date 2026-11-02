/**
 * Pure layout domain logic — no React, no Three.js.
 * Kept framework-free so it can be unit-tested and reused by a backend/API.
 * Coordinate system: metres, room centred at origin, X = width, Z = depth.
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface Room {
  width: number; // X, metres
  depth: number; // Z, metres
}

export interface Fixture {
  id: string;
  type: string; // key into catalog
  x: number;
  z: number;
  rotation: Rotation;
}

export interface Size {
  w: number; // along X when rotation = 0
  d: number; // along Z when rotation = 0
  h: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const GRID = 0.25;

export const snap = (v: number, step = GRID) => Math.round(v / step) * step;

export const nextRotation = (r: Rotation): Rotation => (((r + 90) % 360) as Rotation);

/** Footprint dimensions after rotation (90/270 swap width and depth). */
export function footprint(size: Size, rotation: Rotation): { w: number; d: number } {
  return rotation % 180 === 0 ? { w: size.w, d: size.d } : { w: size.d, d: size.w };
}

export function rectOf(f: Pick<Fixture, 'x' | 'z' | 'rotation'>, size: Size): Rect {
  const { w, d } = footprint(size, f.rotation);
  return { minX: f.x - w / 2, maxX: f.x + w / 2, minZ: f.z - d / 2, maxZ: f.z + d / 2 };
}

/** Keep a fixture fully inside the room. */
export function clampToRoom(x: number, z: number, size: Size, rotation: Rotation, room: Room) {
  const { w, d } = footprint(size, rotation);
  const hx = Math.max(0, room.width / 2 - w / 2);
  const hz = Math.max(0, room.depth / 2 - d / 2);
  return { x: Math.min(hx, Math.max(-hx, x)), z: Math.min(hz, Math.max(-hz, z)) };
}

/** Snap to grid, then clamp — the single rule used for every move. */
export function placeFixture(x: number, z: number, size: Size, rotation: Rotation, room: Room) {
  return clampToRoom(snap(x), snap(z), size, rotation, room);
}

const EPS = 1e-6;
export function overlaps(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX - EPS && a.maxX > b.minX + EPS && a.minZ < b.maxZ - EPS && a.maxZ > b.minZ + EPS;
}

/** Returns ids of fixtures that collide with at least one other fixture. */
export function findCollisions(fixtures: Fixture[], sizeOf: (type: string) => Size): Set<string> {
  const rects = fixtures.map((f) => ({ id: f.id, r: rectOf(f, sizeOf(f.type)) }));
  const hits = new Set<string>();
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i].r, rects[j].r)) {
        hits.add(rects[i].id);
        hits.add(rects[j].id);
      }
    }
  }
  return hits;
}

/** Share of floor area occupied by fixtures (0..1). */
export function floorCoverage(fixtures: Fixture[], sizeOf: (type: string) => Size, room: Room): number {
  const area = fixtures.reduce((sum, f) => {
    const s = sizeOf(f.type);
    return sum + s.w * s.d;
  }, 0);
  return room.width * room.depth === 0 ? 0 : area / (room.width * room.depth);
}

/** Find a free spot for a new fixture, scanning the grid from the room centre outwards. */
export function findFreeSpot(
  size: Size,
  fixtures: Fixture[],
  sizeOf: (type: string) => Size,
  room: Room,
): { x: number; z: number } {
  const existing = fixtures.map((f) => rectOf(f, sizeOf(f.type)));
  const candidates: { x: number; z: number; dist: number }[] = [];
  for (let x = -room.width / 2; x <= room.width / 2; x += GRID * 2) {
    for (let z = -room.depth / 2; z <= room.depth / 2; z += GRID * 2) {
      const p = placeFixture(x, z, size, 0, room);
      candidates.push({ ...p, dist: p.x * p.x + p.z * p.z });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  const free = candidates.find((c) => !existing.some((r) => overlaps(rectOf({ ...c, rotation: 0 }, size), r)));
  return free ? { x: free.x, z: free.z } : { x: 0, z: 0 };
}

/** Runtime validation for imported JSON (the contract a REST/OpenAPI layer would enforce). */
export interface LayoutDoc {
  version: 1;
  room: Room;
  fixtures: Fixture[];
}

export function parseLayout(raw: unknown, knownTypes: string[]): LayoutDoc {
  const fail = (msg: string): never => {
    throw new Error(`Invalid layout: ${msg}`);
  };
  if (typeof raw !== 'object' || raw === null) fail('not an object');
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) fail('unsupported version');
  const room = o.room as Room;
  if (!room || typeof room.width !== 'number' || typeof room.depth !== 'number' || room.width <= 0 || room.depth <= 0)
    fail('room must have positive width/depth');
  if (!Array.isArray(o.fixtures)) fail('fixtures must be an array');
  const fixtures = (o.fixtures as unknown[]).map((f, i) => {
    const x = f as Fixture;
    if (typeof x?.id !== 'string') fail(`fixture ${i}: id`);
    if (!knownTypes.includes(x.type)) fail(`fixture ${i}: unknown type "${x.type}"`);
    if (typeof x.x !== 'number' || typeof x.z !== 'number') fail(`fixture ${i}: position`);
    if (![0, 90, 180, 270].includes(x.rotation)) fail(`fixture ${i}: rotation`);
    return { id: x.id, type: x.type, x: x.x, z: x.z, rotation: x.rotation };
  });
  return { version: 1, room, fixtures };
}
