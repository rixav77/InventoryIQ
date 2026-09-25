import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The shared engine is consumed as live TypeScript source rather than a built
// artifact, so two things need help in dev:
//   1. the bare specifier routes to an in-app shim whose relative import keeps
//      Vite's dependency optimizer out of the engine, and
//   2. the engine's NodeNext ".js" specifiers point at ".ts" files, which Vite
//      does not rewrite on its own.
const coreShim = fileURLToPath(new URL('./src/engine.ts', import.meta.url));

function resolveTsFromJs(): Plugin {
  return {
    name: 'inventoryiq-resolve-ts-from-js',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      // Only project source. Pre-bundled dependencies under node_modules import
      // each other with real ".js" files that must be left alone.
      if (importer === undefined || importer.includes('/node_modules/')) {
        return null;
      }
      if (!source.startsWith('.') || !source.endsWith('.js')) {
        return null;
      }
      const asTs = `${source.slice(0, -3)}.ts`;
      const resolved = await this.resolve(asTs, importer, { ...options, skipSelf: true });
      return resolved === null ? null : resolved;
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJs(), react()],
  resolve: {
    alias: [{ find: '@inventoryiq/core', replacement: coreShim }],
  },
  optimizeDeps: {
    exclude: ['@inventoryiq/core'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
