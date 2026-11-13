import { demoMode, supabase } from './supabase'

export type AiResponse<T> =
  | { ok: true; source: 'ai'; result: T }
  | { ok: false; reason: 'quota' | 'ai_error' | 'not_configured' | 'invalid' | 'not_food' | 'network' | 'auth'; message: string }

/** Panggil endpoint AI di /api/* dengan token login Supabase. Tidak pernah melempar error. */
export async function callAi<T>(path: 'vision' | 'explain' | 'nutrition', body: unknown): Promise<AiResponse<T>> {
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 600))
    return { ok: false, reason: 'not_configured', message: 'Mode demo lokal: AI belum terhubung, menampilkan hasil cadangan.' }
  }
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return { ok: false, reason: 'auth', message: 'Silakan login terlebih dahulu.' }
    const res = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (json && typeof json === 'object' && 'ok' in json) return json as AiResponse<T>
    return { ok: false, reason: 'network', message: 'Server AI tidak merespons. Menampilkan hasil cadangan.' }
  } catch {
    return { ok: false, reason: 'network', message: 'Tidak bisa terhubung ke server AI. Menampilkan hasil cadangan.' }
  }
}
