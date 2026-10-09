import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions reemplaza VITE_BASE_PATH por /nombre-del-repositorio/.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});
