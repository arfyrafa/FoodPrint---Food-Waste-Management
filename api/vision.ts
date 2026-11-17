import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowMethods, consumeAiQuota, requireUser } from './_lib/auth.js'
import { generateJson, parseDataUrl } from './_lib/gemini.js'
import { fail, handleAiError } from './_lib/respond.js'
import { visionGeminiSchema, visionRequest, visionResult } from './_lib/schemas.js'

const SYSTEM = `Kamu adalah ahli gizi dan keamanan pangan untuk kantin/UMKM kuliner Indonesia.
Kamu menerima FOTO SATU MAKANAN. Tugas:
1. Kenali makanannya (nama umum di Indonesia) dan perkirakan 1 porsi yang terlihat (contoh "1 piring", "1 mangkuk").
2. Perkirakan total kalori per porsi.
3. Komposisi gizi makro dalam PERSEN dari total energi: protein_pct, carbs_pct, fat_pct, fiber_pct. Jumlahkan mendekati 100.
4. 3-5 vitamin/mineral paling menonjol dengan perkiraan % AKG (Angka Kecukupan Gizi orang dewasa Indonesia) per porsi,
   contoh {"name":"Vitamin C","akg_pct":25}.
5. Kelayakan makan berdasarkan TANDA VISUAL saja: status "layak", "periksa" (ragu / ada tanda mencurigakan / foto kurang jelas),
   atau "tidak_layak" (jamur, berlendir, warna/tekstur jelas rusak). signs = 2-4 tanda yang terlihat. advice = saran singkat penyimpanan/penanganan.
Aturan:
- Jawab HANYA JSON sesuai skema, Bahasa Indonesia, angka bulat.
- Semua angka adalah PERKIRAAN. Jangan berpura-pura pasti.
- Foto tidak bisa mendeteksi bakteri, racun, atau bau: jika ragu, pilih "periksa" dan sarankan cek bau/rasa/waktu masak.
- Jika foto bukan makanan, is_food=false dan isi nilai lain seadanya (0 / kosong).`


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
    if (!allowed) return fail(res, 'quota', 'Batas 30 penggunaan AI hari ini sudah tercapai. Coba lagi besok.')

    const hint = parsed.data.hint?.trim() ? `Petunjuk dari pengguna: makanan ini kemungkinan "${parsed.data.hint.trim()}".` : ''

    const raw = await generateJson({
      system: SYSTEM,
      parts: [{ text: `${hint}\nAnalisis gizi dan kelayakan makanan pada foto berikut.` }, { inlineData: image }],
      responseSchema: visionGeminiSchema,
      temperature: 0.2,
    })
    const result = visionResult.safeParse(raw)
    if (!result.success) {
      console.error('[AI Vision] Validation error:', result.error, 'Raw Gemini output was:', raw)
      return fail(res, 'ai_error', 'Hasil AI tidak bisa dibaca. Coba lagi.')
    }
    if (!result.data.is_food) return fail(res, 'not_food', 'Foto tidak terdeteksi sebagai makanan. Coba foto lain yang lebih jelas.')

    res.status(200).json({ ok: true, source: 'ai', result: result.data })
  } catch (err) {
    handleAiError(res, err)
  }
}
