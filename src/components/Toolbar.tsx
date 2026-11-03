import { useRef, useState } from 'react';
import { usePlannerStore } from '../store/usePlannerStore';

export function Toolbar() {
  const view = usePlannerStore((s) => s.view);
  const canUndo = usePlannerStore((s) => s.past.length > 0);
  const canRedo = usePlannerStore((s) => s.future.length > 0);
  const { setView, undo, redo, exportLayout, importLayout, reset } = usePlannerStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string | null>(null);

  const onExport = () => {
    const json = JSON.stringify(exportLayout(), null, 2);
    // Download the file, and also copy to clipboard (works in sandboxed embeds where downloads are blocked).
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'store-layout.json' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    navigator.clipboard
      ?.writeText(json)
      .then(() => setStatus('Layout JSON copied to clipboard'))
      .catch(() => setStatus('Layout exported'));
  };

  const onImport = async (file: File) => {
    try {
      importLayout(JSON.parse(await file.text()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file');
    }
  };

  return (
    <header className="toolbar">
      <h1>
        Store Planner <span>3D</span>
      </h1>
      <div className="segmented" role="radiogroup" aria-label="Camera view">
        {(['3d', 'top'] as const).map((v) => (
          <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)}>
            {v === '3d' ? '3D view' : 'Plan view'}
          </button>
        ))}
      </div>
      <div className="row">
        <button onClick={undo} disabled={!canUndo} aria-label="Undo">↶ Undo</button>
        <button onClick={redo} disabled={!canRedo} aria-label="Redo">↷ Redo</button>
        <button onClick={onExport}>Export JSON</button>
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
        <button onClick={reset}>Reset</button>
      </div>
      {status && !error && (
        <p role="status" className="status">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </header>
  );
}
