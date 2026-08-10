import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * TheMealDB serves both the API and the recipe images we render.
 * Everything else is same-origin: no third-party scripts, no analytics,
 * no fonts, no frames (SPEC privacy and security constraints).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https://www.themealdb.com data:",
  "connect-src 'self' https://www.themealdb.com",
  "font-src 'self'",
  "form-action 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

/**
 * Injected into built output only. The dev server needs inline scripts and a
 * websocket for HMR, so applying this in dev would break `npm run dev` — while
 * `vite preview` (what the browser tests run against) serves the built output
 * and therefore exercises the real policy.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: CONTENT_SECURITY_POLICY,
            },
            // After <meta charset>, not before it. The policy applies wherever
            // it sits in <head>, but the charset declaration must stay within
            // the first 1024 bytes or encoding detection falls back to guessing.
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  build: {
    // 'hidden' emits the map but no sourceMappingURL comment, so nothing
    // resolves it automatically -- devtools included. ADR-0003 declines error
    // reporting, so no tooling consumes it either. It exists to be attached by
    // hand when inspecting a deployed build. The file is still served at the
    // guessable <bundle>.js.map path; that is acceptable because the client
    // bundle is public regardless.
    sourcemap: 'hidden',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright owns e2e; Vitest must not try to run those files.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
});
