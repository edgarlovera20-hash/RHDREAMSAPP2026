import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'recharts',
        'motion/react',
        'lucide-react',
        'clsx',
        'tailwind-merge',
      ],
    },
    build: {
      minify: 'esbuild',
      target: 'esnext',
      sourcemap: false,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['recharts'],
            calendar: ['react-big-calendar'],
            motion: ['motion/react'],
          },
        },
      },
    },
  };
});
