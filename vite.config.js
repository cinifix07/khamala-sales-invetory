import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project from a subdirectory, while Vercel
  // serves it from the domain root.
  base: process.env.VERCEL ? '/' : '/khamala-sales-invetory/',
  plugins: [react()],
})
