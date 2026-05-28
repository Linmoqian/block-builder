import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // Tauri 需要用 127.0.0.1 而非 localhost（macOS 权限限制）
    clearScreen: false,
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: '../dist',
      target: process.env.TAURI_ENV_PLATFORM ? 'esnext' : 'modules',
      minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
    server: {
      host: host || false,
      hmr: host
        ? { protocol: 'ws', host, port: 3001 }
        : process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/TmpSrc/**'],
      },
    },
  };
});
