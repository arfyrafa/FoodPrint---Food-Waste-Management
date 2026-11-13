import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowMethods, consumeAiQuota, requireUser } from './_lib/auth.js'
import { generateJson, parseDataUrl, type GeminiPart } from './_lib/gemini.js'
import { fail, handleAiError } from './_lib/respond.js'
import { GOAL_LABEL, nutritionGeminiSchema, nutritionRequest, nutritionResult } from './_lib/schemas.js'

const SYSTEM = `Kamu adalah asisten gizi untuk mahasiswa dan masyarakat umum di Indonesia.
Kamu menilai SATU makanan (dari nama dan/atau foto) terhadap TUJUAN MAKAN pengguna.
Tugas:
1. Perkirakan kandungan gizi untuk 1 porsi umum makanan tersebut di Indonesia (kalori, protein, karbohidrat, lemak, serat dan gula dalam gram,
   natrium dalam miligram), serta tingkat gula dan garam (rendah/sedang/tinggi).
2. Beri verdict: "baik" (cocok untuk tujuan), "cukup" (boleh dengan catatan), atau "kurang" (sebaiknya dibatasi), dan skor 0-100.
3. summary 1-2 kalimat, reasons 2-3 poin, tips 2-3 poin praktis (misal ganti nasi setengah porsi, tambah sayur, kurangi kuah santan).
Aturan:
- Jawab HANYA JSON sesuai skema, Bahasa Indonesia.
- Angka adalah PERKIRAAN; jangan berpura-pura presisi. Bulatkan wajar.
- Jangan memberi diagnosis atau saran medis. Jika pengguna menyebut kondisi kesehatan, sarankan konsultasi tenaga kesehatan di tips.
- Jika input bukan makanan, is_food=false dan isi angka 0.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return
  const auth = await requireUser(req, res)
  if (!auth) return

  const parsed = nutritionRequest.safeParse(req.body)
  if (!parsed.success) return fail(res, 'invalid', parsed.error.issues[0]?.message ?? 'Data tidak valid.', 400)
  const { food, image, goal, notes } = parsed.data

  const parts: GeminiPart[] = [
    {
      text: [
        `Makanan: ${food.trim() || '(lihat foto)'}`,
        `Tujuan pengguna: ${GOAL_LABEL[goal]}`,
        notes.trim() ? `Catatan pengguna: ${notes.trim()}` : '',
      ].filter(Boolean).join('\n'),
    },
  ]
  if (image) {
    const img = parseDataUrl(image)
    if (!img) return fail(res, 'invalid', 'Format foto harus JPG, PNG, atau WebP.', 400)
    parts.push({ inlineData: img })
  }

  try {
    const allowed = await consumeAiQuota(auth.db, auth.user.id, 'nutrition')
    if (!allowed) return fail(res, 'quota', 'Batas 30 penggunaan AI hari ini sudah tercapai. Menampilkan perkiraan cadangan.')

    const raw = await generateJson({ system: SYSTEM, parts, responseSchema: nutritionGeminiSchema, temperature: 0.3 })
    const result = nutritionResult.safeParse(raw)
    if (!result.success) return fail(res, 'ai_error', 'Hasil AI tidak bisa dibaca. Menampilkan perkiraan cadangan.')
    if (!result.data.is_food) return fail(res, 'not_food', 'Itu sepertinya bukan makanan. Coba nama atau foto makanan lain.')
    res.status(200).json({ ok: true, source: 'ai', result: result.data })
  } catch (err) {
    handleAiError(res, err)
  }
}
