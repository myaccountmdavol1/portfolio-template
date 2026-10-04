import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/store/**/*.test.ts'],
    passWithNoTests: true,
    // PGlite (Postgres in WebAssembly) takes a few seconds to start when the whole suite runs in parallel.
    testTimeout: 30_000,
  },
});
