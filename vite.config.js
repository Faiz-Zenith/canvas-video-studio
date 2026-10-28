import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Nama repositori GitHub kamu. Alamat situs nanti: https://<username>.github.io/<REPO_NAME>/
// Harus sama persis dengan nama repositori di GitHub.
const REPO_NAME = 'canvas-video-studio'

export default defineConfig(({ mode }) => ({
  // npm run dev        -> mode 'development': base '/', alamat lokal tidak berubah.
  // npm run build      -> mode 'production' : semua alamat file diawali /<REPO_NAME>/ (untuk GitHub Pages).
  // npm run preview    -> mode 'production' : ikut memakai /<REPO_NAME>/, sama seperti situs yang online.
  base: mode === 'development' ? '/' : `/${REPO_NAME}/`,
  plugins: [react(), tailwindcss()],
}))