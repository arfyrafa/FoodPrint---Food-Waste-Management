import { useRef } from 'react'
import { Camera, ImagePlus, ScanLine } from 'lucide-react'
import { Button } from './ui'

/** Area foto untuk AI Vision: ambil dari kamera atau galeri, tampilkan pratinjau. */
export function VisionCapture({
  preview,
  busy,
  onFile,
}: {
  preview: string | null
  busy: boolean
  onFile: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pick = () => fileRef.current?.click()

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          if (fileRef.current) fileRef.current.value = ''
        }}
      />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/60 text-sky-900 transition-colors hover:bg-sky-50"
      >
        {preview ? (
          <>
            <img src={preview} alt="Foto makanan" className="absolute inset-0 h-full w-full object-cover" />
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
                <ScanLine className="size-8 animate-pulse" />
                <span className="font-semibold">Gemini sedang menganalisis foto...</span>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm"><Camera className="size-7" /></span>
            <span className="font-bold">Foto satu makanan</span>
            <span className="text-xs text-stone-500">Kamera atau galeri · JPG, PNG, WebP · maks. 5 MB</span>
          </>
        )}
      </button>
      {preview && !busy && (
        <Button type="button" variant="outline" size="sm" icon={<ImagePlus className="size-4" />} onClick={pick}>
          Ganti foto
        </Button>
      )}
    </div>
  )
}
