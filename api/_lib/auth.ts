import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export type AiFeature = 'vision' | 'explain' | 'daily' | 'nutrition'

function env(name: string): string {
  const value = process.env[name] ?? process.env[`VITE_${name}`]
  if (!value) throw new Error(`${name} belum diatur di environment`)
  return value
}

/**
 * Verifikasi JWT Supabase dari header Authorization.
 * Mengembalikan client Supabase yang bertindak sebagai user tersebut (RLS tetap berlaku).
 */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ user: User; db: SupabaseClient } | null> {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    res.status(401).json({ ok: false, message: 'Silakan login terlebih dahulu.' })
    return null
  }
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ ok: false, message: 'Sesi tidak valid, silakan login ulang.' })
    return null
  }
  return { user: data.user, db }
}

/** Awal hari ini dalam zona WIB (UTC+7), dalam ISO string. */
export function startOfTodayWIB(now = Date.now()): string {
  const offset = 7 * 3600_000
  const start = Math.floor((now + offset) / 86_400_000) * 86_400_000 - offset
  return new Date(start).toISOString()
}

/**
 * Rate limit sederhana: maksimal AI_DAILY_LIMIT (default 30) panggilan AI per user per hari.
 * Mengembalikan true jika masih boleh, sekaligus mencatat pemakaian.
 */
export async function consumeAiQuota(db: SupabaseClient, userId: string, feature: AiFeature): Promise<boolean> {
  const limit = Number(process.env.AI_DAILY_LIMIT ?? 30)
  const { count, error } = await db
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfTodayWIB())
  if (error) throw new Error(`Gagal cek kuota AI: ${error.message}`)
  if ((count ?? 0) >= limit) return false
  const { error: insertError } = await db.from('ai_usage').insert({ user_id: userId, feature })
  if (insertError) throw new Error(`Gagal mencatat kuota AI: ${insertError.message}`)
  return true
}

export function allowMethods(req: VercelRequest, res: VercelResponse, methods: string[]): boolean {
  if (!methods.includes(req.method ?? '')) {
    res.setHeader('Allow', methods.join(', '))
    res.status(405).json({ ok: false, message: 'Method tidak diizinkan' })
    return false
  }
  return true
}
