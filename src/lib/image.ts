export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** Validasi & resize foto di browser (sisi terpanjang 1280 px) lalu jadikan data URL JPEG. */
export async function prepareImage(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Format foto harus JPG, PNG, atau WebP.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Ukuran foto maksimal 5 MB.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan foto.')
  ctx.fillStyle = '#ffffff' // PNG transparan -> latar putih
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
