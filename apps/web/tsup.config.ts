import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist/server',
  clean: true,
  sourcemap: true,
  // External packages that should not be bundled (native deps, Prisma)
  external: [
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin-adblocker',
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'ioredis',
  ],
  // Force bundle packages that have ESM/JSON import issues in Node 22
  noExternal: ['disposable-email-domains'],
  // ESM output without CJS shims
  shims: false,
});
