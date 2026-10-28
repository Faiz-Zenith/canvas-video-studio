import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Nama repositori GitHub kamu. Alamat situs nanti: https://<username>.github.io/<REPO_NAME>/
// Ganti sesuai nama repositori yang kamu pilih saat Publish di GitHub Desktop.
const REPO_NAME = 'canvas-video-studio'

export default defineConfig(({ command }) => ({
  // Saat build (untuk GitHub Pages) semua alamat file diawali /<REPO_NAME>/.
  // Saat npm run dev, base tetap '/', jadi alamat lokal tidak berubah.
  base: command === 'build' ? `/${REPO_NAME}/` : '/',
  plugins: [react(), tailwindcss()],
}))