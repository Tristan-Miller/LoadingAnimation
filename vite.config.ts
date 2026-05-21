import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is hosted at https://tristan-miller.github.io/LoadingAnimation/, so
// production assets must be served from /LoadingAnimation/. Local dev keeps '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/LoadingAnimation/' : '/',
  plugins: [react()],
}));
