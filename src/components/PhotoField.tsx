import { useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { prepareImage } from '../lib/image'

/** Kolom foto wajib (kamera atau galeri), otomatis dikecilkan ke 640 px agar ringan. */
export function PhotoField({
  label,
  value,
  onChange,
  onError,
  emptyText = 'Ambil / pilih foto',
  hint,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  onError: (msg: string) => void
  emptyText?: string
  hint?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function pick(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      onChange(await prepareImage(file, 640, 0.75))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Foto tidak bisa diproses.')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      <p className="label">{label} <span className="font-normal text-red-600">(wajib)</span></p>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={value} alt={label} className="aspect-[4/3] w-full object-cover" />
          <button type="button" onClick={() => ref.current?.click()} className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-sm font-semibold text-stone-800 shadow">
            <ImagePlus className="size-4" /> Ganti foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-brand-800 hover:bg-brand-50"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm"><Camera className="size-6" /></span>
          <span className="font-bold">{busy ? 'Memproses foto...' : emptyText}</span>
          <span className="text-xs text-stone-500">Kamera atau galeri · JPG, PNG, WebP</span>
        </button>
      )}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  )
}
