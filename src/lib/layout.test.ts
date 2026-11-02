import { describe, expect, it } from 'vitest';
import {
  clampToRoom,
  findCollisions,
  findFreeSpot,
  floorCoverage,
  footprint,
  nextRotation,
  parseLayout,
  placeFixture,
  snap,
  type Fixture,
  type Size,
} from './layout';

const room = { width: 10, depth: 8 };
const sizes: Record<string, Size> = { box: { w: 2, d: 1, h: 1 } };
const sizeOf = (t: string) => sizes[t];

describe('grid and rotation', () => {
  it('snaps to 25 cm grid', () => {
    expect(snap(1.13)).toBe(1.25);
    expect(snap(-0.12)).toBe(-0);
  });
  it('cycles rotation 0→90→180→270→0', () => {
    expect([0, 90, 180, 270].map((r) => nextRotation(r as 0))).toEqual([90, 180, 270, 0]);
  });
  it('swaps footprint on 90° rotation', () => {
    expect(footprint(sizes.box, 90)).toEqual({ w: 1, d: 2 });
    expect(footprint(sizes.box, 180)).toEqual({ w: 2, d: 1 });
  });
});

describe('placement', () => {
  it('keeps fixtures inside the room', () => {
    expect(clampToRoom(100, -100, sizes.box, 0, room)).toEqual({ x: 4, z: -3.5 });
  });
  it('clamps using rotated footprint', () => {
    expect(clampToRoom(100, 0, sizes.box, 90, room)).toEqual({ x: 4.5, z: 0 });
  });
  it('snaps then clamps', () => {
    expect(placeFixture(1.1, 0.9, sizes.box, 0, room)).toEqual({ x: 1, z: 1 });
  });
});

describe('collisions and metrics', () => {
  const a: Fixture = { id: 'a', type: 'box', x: 0, z: 0, rotation: 0 };
  it('detects overlap', () => {
    const b = { ...a, id: 'b', x: 1 };
    expect([...findCollisions([a, b], sizeOf)].sort()).toEqual(['a', 'b']);
  });
  it('treats touching edges as no overlap', () => {
    const b = { ...a, id: 'b', x: 2 };
    expect(findCollisions([a, b], sizeOf).size).toBe(0);
  });
  it('computes floor coverage', () => {
    expect(floorCoverage([a], sizeOf, room)).toBeCloseTo(2 / 80);
  });
  it('finds a free spot that does not collide', () => {
    const spot = findFreeSpot(sizes.box, [a], sizeOf, room);
    const placed = { id: 'n', type: 'box', rotation: 0 as const, ...spot };
    expect(findCollisions([a, placed], sizeOf).size).toBe(0);
  });
});

describe('parseLayout', () => {
  const valid = { version: 1, room, fixtures: [{ id: 'a', type: 'box', x: 0, z: 0, rotation: 90 }] };
  it('accepts a valid document', () => {
    expect(parseLayout(valid, ['box']).fixtures).toHaveLength(1);
  });
  it('rejects unknown fixture types', () => {
    expect(() => parseLayout(valid, ['other'])).toThrow(/unknown type/);
  });
  it('rejects bad rotation', () => {
    const bad = { ...valid, fixtures: [{ ...valid.fixtures[0], rotation: 45 }] };
    expect(() => parseLayout(bad, ['box'])).toThrow(/rotation/);
  });
  it('rejects wrong version', () => {
    expect(() => parseLayout({ ...valid, version: 2 }, ['box'])).toThrow(/version/);
  });
});
