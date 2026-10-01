import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Each page is built on its own (`vite build --mode <page>`) into one self-contained
 * HTML file, so the finished pages still open straight from disk without a server.
 */
const PAGES: Record<string, string> = {
  home: 'index.html',
  bindery: 'Sprout Bindery.html',
  study: 'Sprout Study.html',
};

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return { plugins: [react()] };

  const page = PAGES[mode];
  if (!page) throw new Error(`Unknown page "${mode}". Build with --mode ${Object.keys(PAGES).join(' | ')}.`);

  return {
    base: './',
    plugins: [react(), viteSingleFile()],
    build: {
      outDir: 'dist',
      // The first page clears dist/, the others are added next to it.
      emptyOutDir: mode === 'home',
      rollupOptions: { input: fileURLToPath(new URL(page, import.meta.url)) },
    },
  };
});
