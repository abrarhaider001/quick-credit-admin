import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** Load `.env`, `.env.local`, etc. from this folder (same dir as `vite.config.js`). */
  envDir: projectRoot,
})
