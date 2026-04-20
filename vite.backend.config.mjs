import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyWasmPlugin() {
  return {
    name: 'copy-backend-wasm',
    closeBundle() {
      const wasmSrc = path.resolve(__dirname, 'node_modules/@silvia-odwyer/photon-node/photon_rs_bg.wasm');
      const wasmDest = path.resolve(__dirname, 'out/backend/photon_rs_bg.wasm');
      try {
        if (fs.existsSync(wasmSrc)) {
          fs.mkdirSync(path.dirname(wasmDest), { recursive: true });
          fs.copyFileSync(wasmSrc, wasmDest);
        }
      } catch (err) {
        console.warn('[copy-backend-wasm] Failed to copy WASM:', err.message);
      }
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      electron: path.resolve(__dirname, 'electron/shims/electron-backend.ts'),
    },
  },
  ssr: {
    noExternal: [
      '@mariozechner/pi-coding-agent',
      '@mariozechner/pi-agent-core',
      '@mariozechner/pi-ai',
      '@mariozechner/jiti',
    ],
  },
  build: {
    ssr: path.resolve(__dirname, 'electron/standalone/index.ts'),
    outDir: path.resolve(__dirname, 'out/backend'),
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
      },
    },
  },
  plugins: [copyWasmPlugin()],
});
