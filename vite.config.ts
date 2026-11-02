import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `SINGLE=1 npm run build` produces one self-contained index.html (for sharing a demo as a single file).
export default defineConfig({
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  base: process.env.BASE_PATH ?? '/',
  test: { environment: 'node' },
});
