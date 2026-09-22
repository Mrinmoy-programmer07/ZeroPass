import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), nodePolyfills({ include: ['buffer', 'assert', 'process'], globals: { Buffer: true, global: true, process: true } })],
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['@midnight-ntwrk/ledger-v8', '@midnight-ntwrk/onchain-runtime-v3'] },
  resolve: {
    alias: { 'isomorphic-ws': fileURLToPath(new URL('./src/lib/browser-websocket.ts', import.meta.url)) },
    dedupe: ['@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/ledger-v8', '@midnight-ntwrk/onchain-runtime-v3'],
  },
})
