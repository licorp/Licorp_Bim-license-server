import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { env: any };

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  }
})