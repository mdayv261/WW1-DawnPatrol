import { defineConfig } from 'vite';

// Vite serves the game in development and builds it for release.
// The "test" block configures Vitest, which runs in plain Node
// (no browser) because physics and loop logic never touch the DOM.
export default defineConfig({
  build: {
    // The game, plus the hangar page for judging the aircraft models.
    rollupOptions: { input: { main: 'index.html', hangar: 'hangar.html' } },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
