import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The shared engine (@inventoryiq/core) is authored as TypeScript with NodeNext
// ".js" specifiers that point at ".ts" files. Vite does not rewrite those by
// default, so resolve them here and let the dashboard consume the live source.
function resolveTsFromJs(): Plugin {
  return {
    name: 'inventoryiq-resolve-ts-from-js',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (importer !== undefined && source.startsWith('.') && source.endsWith('.js')) {
        const asTs = `${source.slice(0, -3)}.ts`;
        const resolved = await this.resolve(asTs, importer, { ...options, skipSelf: true });
        if (resolved !== null) {
          return resolved;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJs(), react()],
  optimizeDeps: {
    exclude: ['@inventoryiq/core'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
