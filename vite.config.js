import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // chemins relatifs : fonctionne sur GitHub Pages (/smile-life/) comme en local
  base: './',
  plugins: [react(), tailwindcss()],
})
