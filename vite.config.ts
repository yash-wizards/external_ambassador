import react from '@vitejs/plugin-react';
import path from 'node:path';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { frameAncestorsDirective, resolveFrameAncestors } from './src/config/framePolicy';

function framePolicyPlugin(ancestors: string[]): Plugin {
  const csp = frameAncestorsDirective(ancestors);
  return {
    name: 'external-ambassador-frame-policy',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', csp);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', csp);
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ancestors = resolveFrameAncestors(env.VITE_FRAME_ANCESTORS, mode === 'development');

  return {
    plugins: [react(), framePolicyPlugin(ancestors)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5180,
      strictPort: true,
    },
    preview: {
      port: 5180,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  };
});
