import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths so the build works on any host or sub-path
  // (e.g. GitHub Pages at /<repo>/), since navigation is state-based.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
})
