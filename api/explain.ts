import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowMethods, consumeAiQuota, requireUser } from './_lib/auth.js'
import { generateJson } from './_lib/gemini.js'
import { fail, handleAiError } from './_lib/respond.js'
import { explainGeminiSchema, explainRequest, explainResult } from './_lib/schemas.js'

const SYSTEM_FORECAST = `Kamu adalah konsultan operasional kantin/UMKM kuliner Indonesia.
Kamu menerima tabel REKOMENDASI PRODUKSI yang sudah dihitung sistem (algoritma rata-rata tertimbang per hari yang sama).
Tugas: jelaskan rekomendasi itu dengan bahasa sederhana untuk pemilik usaha, lalu beri 2-3 saran tindakan.
Aturan WAJIB:
- Gunakan HANYA angka yang ada di data. JANGAN menambah, mengubah, atau menghitung angka baru.
- Sebut hari target (misal Jumat) bila polanya berbeda dari biasa.
- Soroti menu yang rekomendasinya jauh di bawah produksi terakhir (potensi hemat) dan menu dengan data belum cukup.
- summary maksimal 120 kata, Bahasa Indonesia santai tapi sopan. actions: 2-3 kalimat pendek dan konkret.`

const SYSTEM_DAILY = `Kamu adalah konsultan operasional kantin/UMKM kuliner Indonesia.
Kamu menerima ringkasan produksi, penjualan, sisa, dan kerugian (Rupiah, dihitung dari sisa x HPP) untuk SATU HARI.
Tugas: tulis KESIMPULAN HARIAN singkat dan 2-3 saran tindakan untuk besok.
Aturan WAJIB:
- Gunakan HANYA angka yang ada di data. JANGAN membuat angka baru.
- Bandingkan persentase waste hari ini dengan rata-rata 30 hari jika tersedia.
- Sebut menu dengan kerugian terbesar dan menu yang paling efisien.
- summary maksimal 120 kata, Bahasa Indonesia santai tapi sopan. actions: 2-3 kalimat pendek dan konkret.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return
  const auth = await requireUser(req, res)
  if (!auth) return

  const parsed = explainRequest.safeParse(req.body)
  if (!parsed.success) return fail(res, 'invalid', 'Data tidak valid.', 400)
  const input = parsed.data

  try {
    const allowed = await consumeAiQuota(auth.db, auth.user.id, input.mode === 'forecast' ? 'explain' : 'daily')
    if (!allowed) return fail(res, 'quota', 'Batas 30 penggunaan AI hari ini sudah tercapai. Menampilkan penjelasan otomatis.')

    const raw = await generateJson({
      system: input.mode === 'forecast' ? SYSTEM_FORECAST : SYSTEM_DAILY,
      parts: [{ text: `Data (JSON):\n${JSON.stringify(input)}` }],
      responseSchema: explainGeminiSchema,
      temperature: 0.4,
    })
    const result = explainResult.safeParse(raw)
    if (!result.success) return fail(res, 'ai_error', 'Hasil AI tidak bisa dibaca. Menampilkan penjelasan otomatis.')
    res.status(200).json({ ok: true, source: 'ai', result: result.data })
  } catch (err) {
    handleAiError(res, err)
  }
}
