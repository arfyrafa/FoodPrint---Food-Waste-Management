import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** Nilai contoh dari .env.example (xxxxxxxx, eyJhbGciOi...) dianggap belum diisi. */
const isPlaceholder = (v?: string) => !v || /x{6,}|\.\.\.|belum|isi-dari/i.test(v)

export const supabaseConfigured = !isPlaceholder(url) && !isPlaceholder(anonKey)

/** true = web berjalan dengan data contoh di browser (tanpa Supabase). */
export const demoMode = !supabaseConfigured

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : (mockSupabase as unknown as SupabaseClient)

/** Ubah error Supabase/Postgres menjadi pesan ramah Bahasa Indonesia. */
export function friendlyError(error: unknown): string {
  const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : String(error ?? '')
  if (/Invalid login credentials/i.test(msg)) return 'Email atau password salah.'
  if (/User already registered/i.test(msg)) return 'Email ini sudah terdaftar. Silakan login.'
  if (/Email not confirmed/i.test(msg)) return 'Email belum dikonfirmasi. Cek kotak masuk email kamu.'
  if (/Password should be at least/i.test(msg)) return 'Password minimal 6 karakter.'
  if (/rate limit/i.test(msg)) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (/daily_records_check|sold \+ leftover/i.test(msg)) return 'Terjual + sisa tidak boleh lebih dari jumlah diproduksi.'
  if (/violates check constraint/i.test(msg)) return 'Ada nilai yang tidak valid. Periksa kembali isian.'
  if (/row-level security|permission denied/i.test(msg)) return 'Kamu tidak punya akses untuk data ini.'
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) return 'Tidak bisa terhubung ke server. Periksa internet atau isi VITE_SUPABASE_URL di .env dengan benar.'
  if (/JWT|session/i.test(msg)) return 'Sesi berakhir. Silakan login ulang.'
  return msg || 'Terjadi kesalahan. Coba lagi.'
}
