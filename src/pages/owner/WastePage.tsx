// AI Vision: analisis SATU makanan dari foto dengan Gemini
// -> komposisi gizi (%), vitamin & mineral (% AKG), dan kelayakan makan.
// Tidak berhubungan dengan catatan sisa. Hasil tidak disimpan (tanpa riwayat).
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, RotateCcw, ScanLine, ShieldCheck, XCircle } from 'lucide-react'
import { VisionCapture } from '../../components/VisionCapture'
import { AiDisclaimer, Alert, Badge, Button, Card, Field, PageHeader, cn } from '../../components/ui'
import { callAi } from '../../lib/api'
import { num } from '../../lib/format'
import { prepareImage } from '../../lib/image'
import type { FoodScanResult } from '../../lib/types'

// Palet divalidasi aman untuk buta warna; selalu disertai label persen
const MACROS = [
  { key: 'protein_pct', label: 'Protein', color: '#2f6420' },
  { key: 'carbs_pct', label: 'Karbohidrat', color: '#e9a23b' },
  { key: 'fat_pct', label: 'Lemak', color: '#d9480f' },
  { key: 'fiber_pct', label: 'Serat', color: '#1c7ed6' },
] as const

const SAFETY = {
  layak: { label: 'Layak dimakan', icon: CheckCircle2, box: 'border-brand-200 bg-brand-50', text: 'text-brand-800', iconColor: 'text-brand-600' },
  periksa: { label: 'Perlu dicek', icon: AlertTriangle, box: 'border-amber-200 bg-amber-50', text: 'text-amber-900', iconColor: 'text-amber-600' },
  tidak_layak: { label: 'Tidak layak dimakan', icon: XCircle, box: 'border-red-200 bg-red-50', text: 'text-red-800', iconColor: 'text-red-600' },
} as const

function normalize(c: FoodScanResult['composition']) {
  const total = c.protein_pct + c.carbs_pct + c.fat_pct + c.fiber_pct
  if (total <= 0) return c
  const k = 100 / total
  return { protein_pct: c.protein_pct * k, carbs_pct: c.carbs_pct * k, fat_pct: c.fat_pct * k, fiber_pct: c.fiber_pct * k }
}

export default function WastePage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FoodScanResult | null>(null)

  async function analyze(image: string) {
    setBusy(true)
    setError('')
    setResult(null)
    const res = await callAi<FoodScanResult>('vision', { image, hint: hint.trim() || undefined })
    setBusy(false)
    if (res.ok) {
      setResult(res.result)
    } else {
      setError(res.message)
    }
  }

  async function onFile(file: File) {
    setError('')
    try {
      const dataUrl = await prepareImage(file)
      setPreview(dataUrl)
      await analyze(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto tidak bisa diproses.')
    }
  }

  const comp = result ? normalize(result.composition) : null
  const safety = result ? SAFETY[result.safety.status] : null

  return (
    <div className="space-y-5">
      <PageHeader title="AI Vision" subtitle="Foto satu makanan, Gemini menganalisis komposisi gizinya dan apakah masih layak dimakan." />

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Foto */}
        <Card className="space-y-4 p-4 sm:p-5">
          <VisionCapture preview={preview} busy={busy} onFile={onFile} />
          <Field label="Nama makanan (opsional)" htmlFor="vhint" hint="Membantu AI jika makanannya mirip dengan makanan lain.">
            <input id="vhint" className="input" maxLength={120} placeholder="Contoh: soto ayam" value={hint} onChange={(e) => setHint(e.target.value)} />
          </Field>
          {preview && !busy && (
            <Button variant="outline" className="w-full" icon={<RotateCcw className="size-4" />} onClick={() => analyze(preview)}>
              Analisis ulang
            </Button>
          )}
          {error && (
            <Alert tone="danger">
              {error}
            </Alert>
          )}
          <p className="flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Foto dan hasil analisis tidak disimpan.
          </p>
        </Card>

        {/* Hasil */}
        <div>
          {busy && (
            <Card className="space-y-3 p-5">
              <div className="skeleton h-6 w-1/2 rounded" />
              <div className="skeleton h-20 w-full rounded-xl" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </Card>
          )}

          {!busy && !result && (
            <Card className="flex h-full flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <ScanLine className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">Panduan Analisis AI Vision</h3>
                    <p className="text-xs text-stone-500">Pemeriksaan kelayakan pangan & profil gizi otomatis</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-800">1. Deteksi Tanda Visual</p>
                    <p className="mt-1 text-sm text-stone-600">
                      AI memeriksa kematangan masakan, kesegaran tekstur/sayur, serta indikasi jamur atau perubahan fisik sebelum makanan disajikan kembali atau didaftarkan ke etalase surplus.
                    </p>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-800">2. Estimasi Gizi Makro (%)</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Membagi total energi porsi ke dalam rasio Protein, Karbohidrat, Lemak, dan Serat untuk transparansi informasi ke pembeli.
                    </p>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-800">3. Mikronutrien & AKG</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Memperkirakan persentase Angka Kecukupan Gizi (% AKG) untuk vitamin dan mineral utama orang dewasa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                <b>Tips untuk juru masak:</b> Ambil foto dari sudut atas dengan cahaya terang. Jika kuah bersantan atau pekat, ketik nama makanan di kolom sebelah kiri untuk membantu AI.
              </div>
            </Card>
          )}

          {!busy && result && comp && safety && (
            <Card className="fade-in space-y-5 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900">{result.food_name}</h2>
                  <p className="text-sm text-stone-500">{result.portion} · sekitar <b className="text-stone-800">{num(result.calories)} kkal</b></p>
                </div>
                <Badge tone="good">Analisis AI Gemini</Badge>
              </div>
              {result.notes && <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">{result.notes}</p>}

              {/* Kelayakan */}
              <div className={cn('rounded-2xl border p-4', safety.box)}>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('flex items-center gap-2 text-lg font-extrabold', safety.text)}>
                    <safety.icon className={cn('size-6', safety.iconColor)} /> {safety.label}
                  </p>
                  <span className="text-xs font-semibold text-stone-600">Keyakinan {Math.round(result.safety.confidence * 100)}%</span>
                </div>
                {result.safety.signs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-stone-700">
                    {result.safety.signs.map((s) => (
                      <li key={s} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-400" />{s}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 flex items-start gap-2 text-sm font-medium text-stone-800">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-stone-600" /> {result.safety.advice}
                </p>
              </div>

              {/* Komposisi gizi */}
              <div>
                <h3 className="mb-2 font-bold text-stone-900">Komposisi gizi</h3>
                <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Komposisi gizi">
                  {MACROS.map((m) => (
                    <div key={m.key} style={{ width: `${comp[m.key]}%`, background: m.color }} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MACROS.map((m) => (
                    <div key={m.key} className="rounded-xl border border-stone-200 p-2.5">
                      <p className="flex items-center gap-1.5 text-xs text-stone-600">
                        <span className="size-2.5 rounded-sm" style={{ background: m.color }} /> {m.label}
                      </p>
                      <p className="text-xl font-extrabold text-stone-900">{Math.round(comp[m.key])}%</p>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-stone-500">Persentase dari total energi makanan.</p>
              </div>

              {/* Vitamin & mineral */}
              {result.micronutrients.length > 0 && (
                <div>
                  <h3 className="mb-2 font-bold text-stone-900">Vitamin & mineral</h3>
                  <ul className="space-y-2.5">
                    {result.micronutrients.map((v) => (
                      <li key={v.name}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-stone-800">{v.name}</span>
                          <span className="font-bold text-stone-900">{Math.round(v.akg_pct)}% AKG</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, v.akg_pct)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-xs text-stone-500">% AKG = persen dari kebutuhan harian orang dewasa yang dipenuhi 1 porsi.</p>
                </div>
              )}

              <div className="space-y-1">
                <AiDisclaimer />
                <p className="text-xs text-stone-500">Kelayakan dinilai dari tampilan foto saja; bakteri, racun, dan bau tidak terlihat. Jika ragu, jangan disajikan.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
