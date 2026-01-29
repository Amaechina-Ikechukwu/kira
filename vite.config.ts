import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  publicDir: 'public',
  resolve: {
    alias: {
      '@client': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server'),
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
