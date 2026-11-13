import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowMethods, consumeAiQuota, requireUser } from './_lib/auth.js'
import { generateJson, parseDataUrl } from './_lib/gemini.js'
import { fail, handleAiError } from './_lib/respond.js'
import { visionGeminiSchema, visionRequest, visionResult } from './_lib/schemas.js'

const SYSTEM = `Kamu adalah asisten dapur yang menganalisis FOTO SISA MAKANAN di kantin/warung Indonesia.
Tugas: kenali setiap jenis makanan yang terlihat, tentukan kategorinya, dan perkirakan jumlah PORSI yang tersisa.
Aturan:
- Jawab HANYA JSON sesuai skema, semua teks dalam Bahasa Indonesia.
- Kategori: karbohidrat (nasi, mie, kentang, roti), protein (ayam, telur, ikan, daging, tahu, tempe),
  sayur (sayuran, gado-gado, lalapan), lauk_lain (gorengan, sambal, kerupuk), minuman, lainnya.
- Satu porsi standar kantin = 1 piring/mangkuk sajian untuk 1 orang.
- Jika daftar menu outlet diberikan, gunakan nama menu tersebut bila cocok dan hitung porsi relatif terhadap 1 porsi menu itu.
- JANGAN mengarang. Jika ragu, turunkan confidence (0-1) dan jelaskan di notes (misal foto gelap/buram).
- Jika foto bukan makanan, is_food=false dan items kosong.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return
  const auth = await requireUser(req, res)
  if (!auth) return

  const parsed = visionRequest.safeParse(req.body)
  if (!parsed.success) return fail(res, 'invalid', 'Data foto tidak valid.', 400)
  const image = parseDataUrl(parsed.data.image)
  if (!image) return fail(res, 'invalid', 'Format foto harus JPG, PNG, atau WebP.', 400)
  if (image.data.length > 5.5 * 1024 * 1024) return fail(res, 'invalid', 'Ukuran foto maksimal 5 MB.', 400)

  try {
    const allowed = await consumeAiQuota(auth.db, auth.user.id, 'vision')
    if (!allowed) return fail(res, 'quota', 'Batas 30 penggunaan AI hari ini sudah tercapai. Silakan isi manual.')

    const menuText = parsed.data.menus?.length
      ? `Daftar menu outlet: ${parsed.data.menus.join(', ')}.`
      : 'Tidak ada daftar menu.'

    const raw = await generateJson({
      system: SYSTEM,
      parts: [{ text: `${menuText}\nAnalisis foto sisa makanan berikut.` }, { inlineData: image }],
      responseSchema: visionGeminiSchema,
      temperature: 0.2,
    })
    const result = visionResult.safeParse(raw)
    if (!result.success) return fail(res, 'ai_error', 'Hasil AI tidak bisa dibaca. Silakan isi manual.')
    if (!result.data.is_food) return fail(res, 'not_food', 'Foto tidak terdeteksi sebagai makanan. Coba foto lain atau isi manual.')

    res.status(200).json({ ok: true, source: 'ai', result: result.data })
  } catch (err) {
    handleAiError(res, err)
  }
}
