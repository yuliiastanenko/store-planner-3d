import { useEffect } from 'react';
import { Scene } from './components/Scene';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { usePlannerStore } from './store/usePlannerStore';

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** Global keyboard shortcuts — the 3D canvas is fully operable without a mouse. */
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select')) return;
      const s = usePlannerStore.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (!s.selectedId) return;
      if (ARROWS[e.key]) {
        e.preventDefault();
        const [dx, dz] = ARROWS[e.key];
        s.nudge(s.selectedId, dx, dz);
      } else if (e.key === 'r' || e.key === 'R') {
        s.rotate(s.selectedId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        s.remove(s.selectedId);
      } else if (e.key === 'Escape') {
        s.select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  useShortcuts();
  const announcement = usePlannerStore((s) => s.announcement);
  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <div className="viewport">
          <Scene />
          <p className="hint">Drag fixtures to move · right-drag to pan · scroll to zoom</p>
        </div>
        <Sidebar />
      </main>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
