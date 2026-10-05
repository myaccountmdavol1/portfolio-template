import { defineConfig, devices } from '@playwright/test';

const blankSecrets = {
  ANTHROPIC_API_KEY: '',
  SPOTIFY_CLIENT_ID: '',
  SPOTIFY_CLIENT_SECRET: '',
  SPOTIFY_REFRESH_TOKEN: '',
  FIREBASE_PROJECT_ID: '',
  FIREBASE_CLIENT_EMAIL: '',
  FIREBASE_PRIVATE_KEY: '',
  FIRESTORE_EMULATOR_HOST: '',
};

const phoneUse = {
  browserName: 'chromium' as const,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/globalSetup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'desktop',
      testMatch: /desktop\.spec\.ts/,
      testIgnore: /(deeplinks|vercel)\//,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'phone',
      testMatch: /phone\.spec\.ts/,
      testIgnore: /(deeplinks|vercel)\//,
      use: phoneUse,
    },
    // Deep links need a Wallet and Photos, which the seed site doesn't have: these run against a second
    // server that adds them (PORTFOLIO_FIXTURE), so the sample site every other test expects stays the same.
    {
      name: 'links-desktop',
      testMatch: /deeplinks\/.*desktop\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: 'http://localhost:3101' },
    },
    {
      name: 'links-phone',
      testMatch: /deeplinks\/.*phone\.spec\.ts/,
      use: { ...phoneUse, baseURL: 'http://localhost:3101' },
    },
    // The Vercel backend (Postgres on PGlite, a local media folder) on its own server; see webServer below.
    {
      name: 'vercel-desktop',
      testMatch: /vercel\/.*desktop\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: 'http://localhost:3102' },
    },
  ],
  // Their own ports, so they never reuse your everyday `npm run dev`. The blank server-side Firebase vars
  // override .env.local, so getPublishedSite() serves the seed data every test expects — tests never
  // read (or depend on) your real published site. The editor tests use ?editor=local and never touch Firebase.
  // The third server (3102) runs the Vercel backend on PGlite with a local media folder and a fresh database
  // every run (and an empty Next data cache, which would otherwise keep the last run's published site), so the
  // owner journey starts from an unclaimed site; it never reuses a running server.
  webServer: [
    {
      command: 'npx next dev --port 3100',
      url: 'http://localhost:3100',
      env: { NEXT_DIST_DIR: '.next-e2e', ...blankSecrets },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npx next dev --port 3101',
      url: 'http://localhost:3101',
      // The fixture's Messages app is shown only while chat counts as connected. The tests fake /api/chat in the
      // browser, so this placeholder key is never sent anywhere.
      env: { NEXT_DIST_DIR: '.next-e2e-links', PORTFOLIO_FIXTURE: 'deep-links', ...blankSecrets, ANTHROPIC_API_KEY: 'e2e-placeholder-not-a-key' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `node -e "for (const d of ['.data/e2e-vercel','.next-e2e-vercel']) require('fs').rmSync(d,{recursive:true,force:true})" && npx next dev --port 3102`,
      url: 'http://localhost:3102',
      env: {
        NEXT_DIST_DIR: '.next-e2e-vercel',
        ...blankSecrets,
        PORTFOLIO_BACKEND: 'vercel',
        PGLITE_DIR: '.data/e2e-vercel/db',
        MEDIA_DIR: '.data/e2e-vercel/media',
        SETUP_CODE: 'e2e-setup-code',
        // Add-ons checks keys without calling Anthropic or Spotify (src/lib/addons/check.ts). Ignored when NODE_ENV is
        // production, so it can never apply to a deployed site; `next dev` runs as development.
        ADDONS_FAKE_CHECK: '1',
        DATABASE_URL: '',
        POSTGRES_URL: '',
        BLOB_READ_WRITE_TOKEN: '',
        BLOB_STORE_ID: '',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
