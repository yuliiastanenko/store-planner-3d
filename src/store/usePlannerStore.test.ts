import { beforeEach, describe, expect, it } from 'vitest';
import { usePlannerStore } from './usePlannerStore';

const s = () => usePlannerStore.getState();

describe('planner store', () => {
  beforeEach(() => {
    s().reset();
    usePlannerStore.setState({ past: [], future: [] });
  });

  it('adds a fixture and selects it', () => {
    const before = s().fixtures.length;
    s().add('mannequin');
    expect(s().fixtures).toHaveLength(before + 1);
    expect(s().selectedId).toBe(s().fixtures.at(-1)!.id);
  });

  it('treats a whole drag as one undo step', () => {
    const id = s().fixtures[0].id;
    const start = s().fixtures[0].x;
    s().beginDrag(id);
    s().moveTo(id, start + 1, 0);
    s().moveTo(id, start + 2, 0);
    s().endDrag();
    expect(s().past).toHaveLength(1);
    s().undo();
    expect(s().fixtures[0].x).toBe(start);
    s().redo();
    expect(s().fixtures[0].x).toBe(start + 2);
  });

  it('round-trips export/import', () => {
    const doc = s().exportLayout();
    s().remove(doc.fixtures[0].id);
    s().importLayout(JSON.parse(JSON.stringify(doc)));
    expect(s().fixtures).toEqual(doc.fixtures);
  });

  it('rejects invalid imports without changing state', () => {
    const before = s().fixtures;
    expect(() => s().importLayout({ version: 1, room: { width: 0, depth: 1 }, fixtures: [] })).toThrow();
    expect(s().fixtures).toBe(before);
  });
});
