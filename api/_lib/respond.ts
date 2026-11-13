import type { VercelResponse } from '@vercel/node'
import { GeminiError } from './gemini.js'

export type FailReason = 'quota' | 'ai_error' | 'not_configured' | 'invalid' | 'not_food'

/** Respons gagal yang tetap 200 untuk kasus "pakai fallback", agar UI tidak blank. */
export function fail(res: VercelResponse, reason: FailReason, message: string, status = 200) {
  res.status(status).json({ ok: false, reason, message })
}

export function handleAiError(res: VercelResponse, err: unknown) {
  console.error('[AI]', err)
  if (err instanceof GeminiError && err.message.includes('belum diatur')) {
    return fail(res, 'not_configured', 'Layanan AI belum dikonfigurasi. Menampilkan hasil cadangan.')
  }
  return fail(res, 'ai_error', 'AI sedang tidak tersedia. Menampilkan hasil cadangan.')
}
