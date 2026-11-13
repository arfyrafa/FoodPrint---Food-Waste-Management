import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Info } from 'lucide-react'
import { VisionCapture, type EditableItem } from '../../components/VisionCapture'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, PageHeader } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { fetchMenus, useAsync } from '../../lib/data'
import { formatDateLong, num, todayISO } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import { CATEGORY_LABEL, type DailyRecord, type FoodCategory, type VisionItem } from '../../lib/types'

// Hasil scan TIDAK disimpan ke database. Hanya diingat di browser untuk hari ini,
// lalu otomatis hilang besok (tanpa riwayat).
const TODAY_KEY = 'foodprint-vision-today'

type TodayScan = { date: string; outletId: string; items: (VisionItem & { menu_id: string | null })[] }

function readTodayScan(outletId: string): TodayScan | null {
  try {
    const raw = localStorage.getItem(TODAY_KEY)
    if (!raw) return null
    const scan = JSON.parse(raw) as TodayScan
    if (scan.date !== todayISO() || scan.outletId !== outletId) {
      localStorage.removeItem(TODAY_KEY)
      return null
    }
    return scan
  } catch {
    return null
  }
}

const CATEGORY_TONE: Record<FoodCategory, 'good' | 'accent' | 'warn' | 'info' | 'default'> = {
  karbohidrat: 'warn',
  protein: 'accent',
  sayur: 'good',
  lauk_lain: 'default',
  minuman: 'info',
  lainnya: 'default',
}

export default function WastePage() {
  const outlet = useOutlet()
  const toast = useToast()
  const today = todayISO()
  const [items, setItems] = useState<EditableItem[]>([])
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [captureKey, setCaptureKey] = useState(0)
  const [report, setReport] = useState<string[]>([])
  const [lastScan, setLastScan] = useState<TodayScan | null>(() => readTodayScan(outlet.id))

  const { data: menus } = useAsync(() => fetchMenus(outlet.id), [outlet.id])

  // Hapus hasil kemarin saat halaman dibuka di hari berikutnya
  useEffect(() => setLastScan(readTodayScan(outlet.id)), [outlet.id])

  const summary = useMemo(() => {
    const byCat = new Map<FoodCategory, number>()
    for (const i of lastScan?.items ?? []) byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.estimated_portions)
    return [...byCat.entries()].sort((a, b) => b[1] - a[1])
  }, [lastScan])

  async function apply() {
    const valid = items.filter((i) => i.name.trim() && i.estimated_portions > 0)
    if (!valid.length) return toast('Belum ada item dengan nama dan porsi.', 'error')
    setSaving(true)
    setReport([])
    const scanItems = valid.map((i) => ({
      name: i.name.trim(),
      category: i.category,
      estimated_portions: i.estimated_portions,
      confidence: i.confidence,
      menu_id: mapping[i.key] || null,
    }))

    // Perbarui kolom sisa di catatan harian (dipakai dashboard & prediksi besok)
    const messages: string[] = []
    const perMenu = new Map<string, number>()
    for (const i of scanItems) if (i.menu_id) perMenu.set(i.menu_id, (perMenu.get(i.menu_id) ?? 0) + i.estimated_portions)
    if (perMenu.size) {
      const { data: recs, error } = await supabase.from('daily_records').select('*').eq('outlet_id', outlet.id).eq('record_date', today).in('menu_id', [...perMenu.keys()])
      if (error) messages.push(friendlyError(error))
      for (const [menuId, portions] of perMenu) {
        const menuName = menus?.find((m) => m.id === menuId)?.name ?? 'Menu'
        const rec = (recs as DailyRecord[] | null)?.find((r) => r.menu_id === menuId)
        const leftover = Math.round(portions)
        if (!rec) {
          messages.push(`${menuName}: belum ada catatan produksi hari ini. Isi dulu di halaman Catatan.`)
        } else if (rec.sold + leftover > rec.produced) {
          messages.push(`${menuName}: sisa ${leftover} + terjual ${rec.sold} melebihi produksi ${rec.produced}. Periksa catatan harian.`)
        } else {
          const { error: upErr } = await supabase.from('daily_records').update({ leftover }).eq('id', rec.id!)
          messages.push(upErr ? `${menuName}: ${friendlyError(upErr)}` : `${menuName}: sisa diperbarui menjadi ${leftover} porsi.`)
        }
      }
    } else {
      messages.push('Tidak ada item yang dikaitkan ke menu, jadi catatan harian tidak berubah.')
    }

    const scan: TodayScan = { date: today, outletId: outlet.id, items: scanItems }
    try {
      localStorage.setItem(TODAY_KEY, JSON.stringify(scan))
    } catch {
      /* abaikan */
    }
    setLastScan(scan)
    setSaving(false)
    setReport(messages)
    toast('Hasil scan diterapkan.')
    setItems([])
    setMapping({})
    setCaptureKey((k) => k + 1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Vision sisa makanan"
        subtitle="Foto sisa makanan, AI mengenali kategori (karbohidrat, protein, sayur, dll.) dan memperkirakan jumlah porsi."
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4 p-4 sm:p-5">
          <p className="text-sm font-semibold text-stone-700">Scan untuk hari ini · {formatDateLong(today)}</p>

          <VisionCapture
            key={captureKey}
            menus={menus?.map((m) => m.name) ?? []}
            onItemsChange={(next) => {
              setItems(next)
              // tebak pemetaan menu dari nama item
              setMapping((prev) => {
                const map = { ...prev }
                for (const it of next) {
                  if (map[it.key] !== undefined) continue
                  const word = it.name.toLowerCase().split(' ')[0]
                  const guess = word ? menus?.find((m) => m.name.toLowerCase().includes(word)) : undefined
                  map[it.key] = guess?.id ?? ''
                }
                return map
              })
            }}
            renderItemExtra={(item) => (
              <select
                className="ml-auto rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
                aria-label="Kaitkan ke menu"
                value={mapping[item.key] ?? ''}
                onChange={(e) => setMapping((m) => ({ ...m, [item.key]: e.target.value }))}
              >
                <option value="">Tidak dikaitkan ke menu</option>
                {menus?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          />

          {items.length > 0 && (
            <div className="space-y-2 border-t border-stone-100 pt-4">
              <p className="text-sm text-stone-600">
                Item yang dikaitkan ke menu akan mengisi kolom <b>sisa</b> di catatan hari ini, lalu dipakai untuk prediksi produksi besok.
              </p>
              <Button onClick={apply} loading={saving} className="w-full" icon={<ClipboardCheck className="size-4" />}>Terapkan hasil</Button>
            </div>
          )}
          {report.length > 0 && (
            <Alert tone="info" title="Catatan harian">
              <ul className="list-disc pl-4">{report.map((r) => <li key={r}>{r}</li>)}</ul>
            </Alert>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-stone-900">Hasil scan hari ini</h2>
          {lastScan ? (
            <div className="fade-in mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {summary.map(([cat, portions]) => (
                  <div key={cat} className="rounded-xl bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">{CATEGORY_LABEL[cat]}</p>
                    <p className="text-lg font-extrabold text-stone-900">{num(portions)} porsi</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastScan.items.map((i, idx) => (
                  <Badge key={idx} tone={CATEGORY_TONE[i.category] ?? 'default'}>{i.name} · {num(i.estimated_portions)}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-600">Belum ada scan hari ini.</p>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Foto dan hasil scan tidak disimpan sebagai riwayat. Hasil ini hanya tampil hari ini dan hilang otomatis besok.
          </p>
        </Card>
      </div>
    </div>
  )
}
