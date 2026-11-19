import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ma3den-gold/' : '/',
  plugins: [react()],
}));
