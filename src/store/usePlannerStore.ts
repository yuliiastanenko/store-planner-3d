import { create } from 'zustand';
import { CATALOG, KNOWN_TYPES, sizeOf } from '../data/catalog';
import {
  type Fixture,
  type LayoutDoc,
  type Room,
  findFreeSpot,
  nextRotation,
  parseLayout,
  placeFixture,
  GRID,
} from '../lib/layout';

type ViewMode = '3d' | 'top';

interface Snapshot {
  room: Room;
  fixtures: Fixture[];
}

export interface PlannerState {
  room: Room;
  fixtures: Fixture[];
  selectedId: string | null;
  draggingId: string | null;
  view: ViewMode;
  past: Snapshot[];
  future: Snapshot[];
  announcement: string; // for aria-live screen-reader feedback

  select: (id: string | null) => void;
  add: (type: string) => void;
  remove: (id: string) => void;
  rotate: (id: string) => void;
  /** Call once at drag start so the whole drag is a single undo step. */
  beginDrag: (id: string) => void;
  endDrag: () => void;
  moveTo: (id: string, x: number, z: number) => void;
  nudge: (id: string, dx: number, dz: number) => void;
  setView: (v: ViewMode) => void;
  undo: () => void;
  redo: () => void;
  exportLayout: () => LayoutDoc;
  importLayout: (raw: unknown) => void;
  reset: () => void;
}

const DEFAULT_ROOM: Room = { width: 12, depth: 9 };

const DEFAULT_FIXTURES: Fixture[] = [
  { id: 'f1', type: 'wall-shelf', x: -3, z: -4.25, rotation: 0 },
  { id: 'f2', type: 'wall-shelf', x: -0.5, z: -4.25, rotation: 0 },
  { id: 'f3', type: 'gondola', x: -2.5, z: -1, rotation: 0 },
  { id: 'f4', type: 'gondola', x: -2.5, z: 1.5, rotation: 0 },
  { id: 'f5', type: 'display-table', x: 2, z: -0.5, rotation: 0 },
  { id: 'f6', type: 'clothes-rack', x: 4.5, z: -2.5, rotation: 90 },
  { id: 'f7', type: 'mannequin', x: 3.75, z: 2.75, rotation: 0 },
  { id: 'f8', type: 'checkout', x: 4.5, z: 3.5, rotation: 0 },
];

const label = (type: string) => CATALOG.find((c) => c.type === type)?.label ?? type;
let idCounter = 100;
const newId = () => `f${++idCounter}`;

export const usePlannerStore = create<PlannerState>((set, get) => {
  /** Record current layout for undo, clear redo stack. */
  const commit = () => {
    const { room, fixtures, past } = get();
    set({ past: [...past.slice(-49), { room, fixtures }], future: [] });
  };

  const update = (id: string, fn: (f: Fixture) => Fixture) =>
    set({ fixtures: get().fixtures.map((f) => (f.id === id ? fn(f) : f)) });

  return {
    room: DEFAULT_ROOM,
    fixtures: DEFAULT_FIXTURES,
    selectedId: null,
    draggingId: null,
    view: '3d',
    past: [],
    future: [],
    announcement: '',

    select: (id) => {
      const f = get().fixtures.find((x) => x.id === id);
      set({ selectedId: id, announcement: f ? `${label(f.type)} selected` : 'Selection cleared' });
    },

    add: (type) => {
      commit();
      const { fixtures, room } = get();
      const pos = findFreeSpot(sizeOf(type), fixtures, sizeOf, room);
      const f: Fixture = { id: newId(), type, rotation: 0, ...pos };
      set({ fixtures: [...fixtures, f], selectedId: f.id, announcement: `${label(type)} added` });
    },

    remove: (id) => {
      const f = get().fixtures.find((x) => x.id === id);
      if (!f) return;
      commit();
      set({
        fixtures: get().fixtures.filter((x) => x.id !== id),
        selectedId: null,
        announcement: `${label(f.type)} removed`,
      });
    },

    rotate: (id) => {
      commit();
      const { room } = get();
      update(id, (f) => {
        const rotation = nextRotation(f.rotation);
        return { ...f, rotation, ...placeFixture(f.x, f.z, sizeOf(f.type), rotation, room) };
      });
      const f = get().fixtures.find((x) => x.id === id);
      if (f) set({ announcement: `Rotated to ${f.rotation} degrees` });
    },

    beginDrag: (id) => {
      commit();
      set({ draggingId: id, selectedId: id });
    },
    endDrag: () => set({ draggingId: null }),

    moveTo: (id, x, z) => {
      const { room } = get();
      update(id, (f) => ({ ...f, ...placeFixture(x, z, sizeOf(f.type), f.rotation, room) }));
    },

    nudge: (id, dx, dz) => {
      commit();
      const f = get().fixtures.find((x) => x.id === id);
      if (!f) return;
      get().moveTo(id, f.x + dx * GRID, f.z + dz * GRID);
      const g = get().fixtures.find((x) => x.id === id)!;
      set({ announcement: `Position ${g.x.toFixed(2)}, ${g.z.toFixed(2)} metres` });
    },

    setView: (view) => set({ view }),

    undo: () => {
      const { past, future, room, fixtures } = get();
      const prev = past.at(-1);
      if (!prev) return;
      set({ ...prev, past: past.slice(0, -1), future: [{ room, fixtures }, ...future], announcement: 'Undone' });
    },
    redo: () => {
      const { past, future, room, fixtures } = get();
      const next = future[0];
      if (!next) return;
      set({ ...next, future: future.slice(1), past: [...past, { room, fixtures }], announcement: 'Redone' });
    },

    exportLayout: () => ({ version: 1, room: get().room, fixtures: get().fixtures }),
    importLayout: (raw) => {
      const doc = parseLayout(raw, KNOWN_TYPES); // throws on invalid input
      commit();
      set({ room: doc.room, fixtures: doc.fixtures, selectedId: null, announcement: 'Layout imported' });
    },
    reset: () => {
      commit();
      set({ room: DEFAULT_ROOM, fixtures: DEFAULT_FIXTURES, selectedId: null, announcement: 'Layout reset' });
    },
  };
});
