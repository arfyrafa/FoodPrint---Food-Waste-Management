import { useRef, useState } from 'react'
import { Camera, ImagePlus, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { callAi } from '../lib/api'
import { prepareImage } from '../lib/image'
import { CATEGORY_LABEL, type FoodCategory, type VisionItem, type VisionResult } from '../lib/types'
import { AiDisclaimer, Alert, Badge, Button } from './ui'

/** Contoh hasil untuk mode demo saat AI tidak tersedia. */
const SAMPLE_RESULT: VisionResult = {
  is_food: true,
  items: [
    { name: 'Nasi putih', category: 'karbohidrat', estimated_portions: 3, confidence: 0.8 },
    { name: 'Ayam goreng', category: 'protein', estimated_portions: 2, confidence: 0.75 },
    { name: 'Gado-gado', category: 'sayur', estimated_portions: 4, confidence: 0.7 },
  ],
  notes: 'Ini hasil contoh (bukan dari foto kamu).',
}

export type EditableItem = VisionItem & { key: number }

let keySeq = 0
const withKeys = (items: VisionItem[]): EditableItem[] => items.map((i) => ({ ...i, key: ++keySeq }))

function confidenceBadge(c: number) {
  if (c >= 0.75) return <Badge tone="good">Yakin {Math.round(c * 100)}%</Badge>
  if (c >= 0.5) return <Badge tone="warn">Sedang {Math.round(c * 100)}%</Badge>
  return <Badge tone="danger">Rendah {Math.round(c * 100)}%</Badge>
}

export function VisionCapture({
  menus,
  onItemsChange,
  renderItemExtra,
}: {
  menus: string[]
  onItemsChange: (items: EditableItem[], notes: string) => void
  renderItemExtra?: (item: EditableItem) => React.ReactNode
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<EditableItem[] | null>(null)
  const [notes, setNotes] = useState('')

  const update = (next: EditableItem[], nextNotes = notes) => {
    setItems(next)
    onItemsChange(next, nextNotes)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    setItems(null)
    try {
      const dataUrl = await prepareImage(file)
      setPreview(dataUrl)
      setBusy(true)
      const res = await callAi<VisionResult>('vision', { image: dataUrl, menus })
      if (res.ok) {
        setNotes(res.result.notes)
        update(withKeys(res.result.items), res.result.notes)
        const low = res.result.items.length === 0 || res.result.items.every((i) => i.confidence < 0.5)
        if (low) setError('Keyakinan AI rendah. Periksa dan koreksi hasilnya, atau isi manual.')
      } else {
        setError(res.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto tidak bisa diproses.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const setItem = (key: number, patch: Partial<VisionItem>) =>
    items && update(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-brand-800 transition-colors hover:bg-brand-50 sm:aspect-[16/9]"
      >
        {preview ? (
          <>
            <img src={preview} alt="Foto sisa makanan" className="absolute inset-0 h-full w-full object-cover" />
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
                <Sparkles className="size-7 animate-pulse" />
                <span className="font-semibold">AI sedang menganalisis foto...</span>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-2xl bg-white shadow-sm"><Camera className="size-7" /></span>
            <span className="font-bold">Ambil / unggah foto sisa makanan</span>
            <span className="text-xs text-stone-500">JPG, PNG, WebP · maks. 5 MB</span>
          </>
        )}
      </button>

      {preview && !busy && (
        <Button type="button" variant="outline" size="sm" icon={<ImagePlus className="size-4" />} onClick={() => fileRef.current?.click()}>
          Ganti foto
        </Button>
      )}

      {error && (
        <Alert tone="warn">
          {error}
          {!items && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => update([{ key: ++keySeq, name: '', category: 'lainnya', estimated_portions: 1, confidence: 1 }], '')}>
                Isi manual
              </Button>
              <Button type="button" size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => { setNotes(SAMPLE_RESULT.notes); update(withKeys(SAMPLE_RESULT.items), SAMPLE_RESULT.notes) }}>
                Pakai hasil contoh
              </Button>
            </div>
          )}
        </Alert>
      )}

      {items && (
        <div className="fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900">Hasil (bisa diedit)</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={<Plus className="size-4" />}
              onClick={() => update([...items, { key: ++keySeq, name: '', category: 'lainnya', estimated_portions: 1, confidence: 1 }])}
            >
              Tambah item
            </Button>
          </div>
          {notes && <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">Catatan AI: {notes}</p>}
          {items.length === 0 && <p className="text-sm text-stone-500">Tidak ada item. Tambahkan secara manual.</p>}
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border border-stone-200 p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_0.7fr]">
                  <input
                    className="input col-span-2 sm:col-span-1"
                    placeholder="Nama makanan"
                    aria-label="Nama makanan"
                    value={item.name}
                    onChange={(e) => setItem(item.key, { name: e.target.value })}
                  />
                  <select className="input" aria-label="Kategori" value={item.category} onChange={(e) => setItem(item.key, { category: e.target.value as FoodCategory })}>
                    {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={0.5}
                    aria-label="Perkiraan porsi"
                    value={item.estimated_portions}
                    onChange={(e) => setItem(item.key, { estimated_portions: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
                <button type="button" onClick={() => update(items.filter((i) => i.key !== item.key))} className="grid size-10 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Hapus item">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {confidenceBadge(item.confidence)}
                <span className="text-xs text-stone-500">porsi tersisa</span>
                {renderItemExtra?.(item)}
              </div>
            </div>
          ))}
          <AiDisclaimer />
        </div>
      )}
    </div>
  )
}
