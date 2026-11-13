import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Saat `npm run dev` (tanpa vercel dev), arahkan /api ke `vercel dev` di port 3000
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'api/**/*.test.ts'] },
})
