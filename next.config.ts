import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The e2e server builds into its own folder so it can run next to your everyday `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  devIndicators: false,
  // PGlite ships WASM that Next must not bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  // PGLITE_DIR is for local development and tests only. Keep PGlite's ~21 MB dist out of every deployed function's file trace.
  outputFileTracingExcludes: { '/*': ['node_modules/@electric-sql/pglite/**'] },
  // /api/og reads icon PNGs from public/icons/<pack>/ (copied there by npm run icons:install before the build).
  outputFileTracingIncludes: { '/api/og': ['./public/icons/**/*.png'] },
  // The editor's sign-in page lives at /admin; /edit and /login are easy-to-guess aliases.
  redirects() {
    return [
      { source: '/edit', destination: '/admin', permanent: false },
      { source: '/login', destination: '/admin', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.firebasestorage.app' },
      // Vercel Blob uploads (sites on the Vercel backend).
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Credly badge art: lets the editor read a badge's colour for its Wallet pass.
      { protocol: 'https', hostname: 'images.credly.com' },
      // Accredible badge art (Google for Education and other issuers).
      { protocol: 'https', hostname: 'artifacts.credential.net' },
      // Parchment / Badgr badge art.
      { protocol: 'https', hostname: 'media.badges.parchment.com' },
    ],
  },
};

export default nextConfig;
