import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Include specific polyfills needed for Solana
      include: ['buffer', 'process', 'util', 'assert'],
    }),
  ],
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: 'util',
    },
  },
  define: {
    'process.env': {},
    // Fix for "global is not defined"
    global: 'globalThis',
  },
});
