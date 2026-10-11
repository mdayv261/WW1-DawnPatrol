import { defineConfig } from 'vite';

// Vite serves the game in development and builds it for release.
// The "test" block configures Vitest, which runs in plain Node
// (no browser) because physics and loop logic never touch the DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
