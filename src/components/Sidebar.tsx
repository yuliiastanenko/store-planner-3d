import { useMemo } from 'react';
import { CATALOG, getItem, sizeOf } from '../data/catalog';
import { findCollisions, floorCoverage, footprint } from '../lib/layout';
import { usePlannerStore } from '../store/usePlannerStore';

export function Sidebar() {
  const fixtures = usePlannerStore((s) => s.fixtures);
  const room = usePlannerStore((s) => s.room);
  const selectedId = usePlannerStore((s) => s.selectedId);
  const { add, select, rotate, remove, nudge } = usePlannerStore.getState();

  const collisions = useMemo(() => findCollisions(fixtures, sizeOf), [fixtures]);
  const coverage = useMemo(() => floorCoverage(fixtures, sizeOf, room), [fixtures, room]);
  const selected = fixtures.find((f) => f.id === selectedId);

  return (
    <aside className="sidebar" aria-label="Planner controls">
      <section aria-labelledby="catalog-h">
        <h2 id="catalog-h">Add fixture</h2>
        <div className="catalog">
          {CATALOG.map((c) => (
            <button key={c.type} className="catalog-item" onClick={() => add(c.type)}>
              <span className="swatch" style={{ background: c.color }} aria-hidden />
              <span>{c.label}</span>
              <small>
                {c.size.w}×{c.size.d} m
              </small>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="stats-h">
        <h2 id="stats-h">Layout</h2>
        <dl className="stats">
          <div>
            <dt>Room</dt>
            <dd>
              {room.width}×{room.depth} m
            </dd>
          </div>
          <div>
            <dt>Fixtures</dt>
            <dd>{fixtures.length}</dd>
          </div>
          <div>
            <dt>Floor used</dt>
            <dd>{Math.round(coverage * 100)}%</dd>
          </div>
          <div className={collisions.size ? 'warn' : 'ok'}>
            <dt>Conflicts</dt>
            <dd>{collisions.size ? `${collisions.size} overlapping` : 'None'}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="inspector-h">
        <h2 id="inspector-h">Selected</h2>
        {selected ? (
          <div className="inspector">
            <p className="inspector-title">{getItem(selected.type).label}</p>
            <p className="muted">
              x {selected.x.toFixed(2)} · z {selected.z.toFixed(2)} · {selected.rotation}° ·{' '}
              {footprint(sizeOf(selected.type), selected.rotation).w}×
              {footprint(sizeOf(selected.type), selected.rotation).d} m
            </p>
            <div className="nudge" role="group" aria-label="Move selected fixture">
              <button aria-label="Move up" onClick={() => nudge(selected.id, 0, -1)}>↑</button>
              <button aria-label="Move left" onClick={() => nudge(selected.id, -1, 0)}>←</button>
              <button aria-label="Move down" onClick={() => nudge(selected.id, 0, 1)}>↓</button>
              <button aria-label="Move right" onClick={() => nudge(selected.id, 1, 0)}>→</button>
            </div>
            <div className="row">
              <button onClick={() => rotate(selected.id)}>Rotate 90°</button>
              <button className="danger" onClick={() => remove(selected.id)}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">Click a fixture in the scene or pick one below.</p>
        )}
      </section>

      <section aria-labelledby="list-h">
        <h2 id="list-h">Fixtures ({fixtures.length})</h2>
        <ul className="fixture-list">
          {fixtures.map((f) => (
            <li key={f.id}>
              <button
                aria-pressed={f.id === selectedId}
                className={collisions.has(f.id) ? 'has-conflict' : undefined}
                onClick={() => select(f.id === selectedId ? null : f.id)}
              >
                <span className="swatch" style={{ background: getItem(f.type).color }} aria-hidden />
                {getItem(f.type).label}
                {collisions.has(f.id) && <span className="badge">overlap</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="keys-h" className="keys">
        <h2 id="keys-h">Keyboard</h2>
        <ul>
          <li><kbd>←↑↓→</kbd> move 25 cm</li>
          <li><kbd>R</kbd> rotate · <kbd>Del</kbd> delete · <kbd>Esc</kbd> deselect</li>
          <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redo</li>
        </ul>
      </section>
    </aside>
  );
}
