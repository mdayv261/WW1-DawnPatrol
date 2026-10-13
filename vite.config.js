import { defineConfig } from 'vite';

// Vite serves the game in development and builds it for release.
// The "test" block configures Vitest, which runs in plain Node
// (no browser) because physics and loop logic never touch the DOM.
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the game at https://mdayv261.github.io/WW1-DawnPatrol/, so the release
  // build's files live under that folder (and `vite preview` serves them there too). The dev
  // server stays at the site root.
  base: command === 'build' || isPreview ? '/WW1-DawnPatrol/' : '/',
  build: {
    // The game, plus the hangar page for judging the aircraft models.
    rollupOptions: { input: { main: 'index.html', hangar: 'hangar.html' } },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
}));
