import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
    mimeTypes: {
      'application/javascript': ['mjs'],
    },
    historyApiFallback: true, // Esto maneja las rutas en modo desarrollo
  },
  build: {
    rollupOptions: {
      input: './index.html', // Asegúrate de que esto apunte a tu archivo index.html
    },
  },
});
