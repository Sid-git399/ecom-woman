import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // The audience is on mid-range Android over mobile data, so the initial
    // payload matters more than the request count. Vendors are split so a
    // React or Framer upgrade does not invalidate the app chunk.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          // framer-motion is deliberately NOT named here. App.jsx loads its
          // feature bundle through LazyMotion with a dynamic import, and a
          // manual chunk merges that dynamic import back into one file —
          // measured at 64KB gzip in the initial payload rather than the
          // ~24KB the split actually costs.
          if (id.includes('lucide-react')) return 'vendor-icons';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 250,
  },
});
