import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevServer(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const urlObj = new URL(req.url, 'http://localhost')
        const endpoint = urlObj.pathname.replace(/^\/api\//, '').replace(/\/$/, '')

        if (!['vision', 'explain', 'nutrition'].includes(endpoint)) {
          return next()
        }

        try {
          // Muat variabel environment (.env) ke process.env server lokal
          const env = loadEnv('development', process.cwd(), '')
          Object.assign(process.env, env)

          // Baca request body
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk))
          }
          const raw = Buffer.concat(chunks).toString('utf-8')
          let body = {}
          try {
            body = raw ? JSON.parse(raw) : {}
          } catch {}

          const customReq = Object.assign(req, {
            body,
            query: Object.fromEntries(urlObj.searchParams),
          })

          const customRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code
              return customRes
            },
            json(data: unknown) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return customRes
            },
          })

          const modulePath = `/api/${endpoint}.ts`
          const mod = await server.ssrLoadModule(modulePath)
          if (typeof mod.default === 'function') {
            await mod.default(customReq, customRes)
          } else {
            customRes.status(500).json({ ok: false, message: `Handler untuk ${endpoint} tidak valid.` })
          }
        } catch (err: unknown) {
          console.error(`[API dev server error in ${endpoint}]:`, err)
          if (!res.headersSent) {
            const msg = err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI.'
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, reason: 'ai_error', message: msg }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevServer()],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'api/**/*.test.ts'] },
})

