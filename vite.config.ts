import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Builds index.html into one self-contained file (dist/index.html), so it opens
 * straight from disk and the desktop app can load it without a server.
 */
export default defineConfig(({ command }) => {
  if (command === 'serve') return { plugins: [react()] };

  return {
    base: './',
    plugins: [react(), viteSingleFile()],
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
