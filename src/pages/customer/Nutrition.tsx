import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, CheckCircle2, Lightbulb, NotebookPen, Salad, X } from 'lucide-react'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, Field, PageHeader, cn } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { callAi } from '../../lib/api'
import { nutritionFallback } from '../../lib/fallback'
import { num, todayISO } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import { GOALS } from '../../lib/diet'
import { prepareImage } from '../../lib/image'
import { DIET_GOAL_LABEL, type DietGoal, type NutritionResult } from '../../lib/types'

const VERDICT = {
  baik: { label: 'Cocok untuk tujuanmu', ring: 'text-brand-600', tone: 'good' as const },
  cukup: { label: 'Boleh, dengan catatan', ring: 'text-amber-500', tone: 'warn' as const },
  kurang: { label: 'Sebaiknya dibatasi', ring: 'text-red-500', tone: 'danger' as const },
}
const LEVEL_TONE = { rendah: 'good', sedang: 'warn', tinggi: 'danger' } as const

function ScoreRing({ score, className }: { score: number; className: string }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 80 80" className="size-24 shrink-0" role="img" aria-label={`Skor ${score} dari 100`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#ece9e1" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 40 40)" className={className}
      />
      <text x="40" y="45" textAnchor="middle" className="fill-stone-900 text-[18px] font-extrabold">{Math.round(score)}</text>
    </svg>
  )
}

export default function Nutrition() {
  const { profile } = useAuth()
  const [params] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [food, setFood] = useState(params.get('food') ?? '')
  const [image, setImage] = useState<string | null>(null)
  const [goal, setGoal] = useState<DietGoal>(profile?.diet_goal ?? 'seimbang')
  const [result, setResult] = useState<NutritionResult | null>(null)
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [logged, setLogged] = useState(false)
  const [logging, setLogging] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  async function logFood() {
    if (!result || !profile) return
    setLogging(true)
    const { error: err } = await supabase.from('food_logs').insert({
      user_id: profile.id,
      log_date: todayISO(),
      food_name: result.food_name,
      portion: result.portion,
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      sugar_g: result.sugar_g,
      sodium_mg: result.sodium_mg,
      verdict: result.verdict,
      score: Math.round(result.score),
    })
    setLogging(false)
    if (err) return toast(friendlyError(err), 'error')
    setLogged(true)
    toast(`${result.food_name} dicatat ke makanan hari ini.`)
  }

  async function onFile(file?: File) {
    if (!file) return
    setError('')
    try {
      setImage(await prepareImage(file, 1024))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto tidak bisa diproses.')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!food.trim() && !image) return setError('Isi nama makanan atau unggah foto.')
    setBusy(true)
    setResult(null)
    setLogged(false)
    const res = await callAi<NutritionResult>('nutrition', { food: food.trim(), image: image ?? undefined, goal, notes: profile?.diet_notes ?? '' })
    setBusy(false)
    if (res.ok) {
      setResult(res.result)
      setSource('ai')
      return
    }
    if (res.reason === 'not_food' || res.reason === 'invalid') return setError(res.message)
    const fb = nutritionFallback(food, goal)
    if (fb) {
      setResult(fb)
      setSource('fallback')
      setNotice(res.message)
    } else {
      setError(`${res.message.replace('Menampilkan perkiraan cadangan.', '')} Makanan ini belum ada di data cadangan, coba lagi nanti.`)
    }
  }

  const v = result ? VERDICT[result.verdict] : null

  return (
    <div className="space-y-5">
      <PageHeader title="Cek gizi AI" subtitle="Cek apakah makanan yang ingin kamu makan cocok dengan program dietmu." />

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4 sm:p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Makanan" htmlFor="food">
              <input id="food" className="input" maxLength={120} value={food} onChange={(e) => setFood(e.target.value)} placeholder="Contoh: nasi ayam goreng + es teh" />
            </Field>

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            {image ? (
              <div className="relative overflow-hidden rounded-xl">
                <img src={image} alt="Foto makanan" className="max-h-56 w-full object-cover" />
                <button type="button" onClick={() => setImage(null)} className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Hapus foto">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" icon={<Camera className="size-4" />} onClick={() => fileRef.current?.click()}>
                Tambah foto (opsional)
              </Button>
            )}

            <Field label="Tujuan makan" htmlFor="goal" hint={profile?.diet_goal ? 'Default dari profilmu, bisa diubah di halaman Profil.' : undefined}>
              <select id="goal" className="input" value={goal} onChange={(e) => setGoal(e.target.value as DietGoal)}>
                {Object.entries(DIET_GOAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            {profile?.diet_notes && <p className="text-xs text-stone-500">Catatan diet: {profile.diet_notes} · <Link to="/profile" className="underline">ubah</Link></p>}
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" className="w-full" size="lg" loading={busy} icon={<Salad className="size-4" />}>Cek sekarang</Button>
          </form>
        </Card>

        <div>
          {busy && (
            <Card className="space-y-3 p-5">
              <div className="skeleton h-6 w-1/2 rounded" />
              <div className="skeleton h-24 w-full rounded-xl" />
              <div className="skeleton h-4 w-5/6 rounded" />
            </Card>
          )}
          {!busy && !result && (
            <Card className="flex h-full flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <Salad className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">Panduan & Cara Kerja Cek Gizi</h3>
                    <p className="text-xs text-stone-500">Personalisasi nutrisi berdasarkan tujuan diet harianmu</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3.5 text-sm text-stone-600">
                  <p>
                    AI akan menghitung perkiraan <b>kalori total</b>, makronutrien (protein, karbohidrat, lemak, serat), serta kadar gula dan natrium dari nama atau foto makanan.
                  </p>
                  <p>
                    Setiap makanan diberikan <b>Skor Kesesuaian (0–100)</b> dan status (<i>Cocok</i>, <i>Boleh dengan catatan</i>, atau <i>Sebaiknya dibatasi</i>) sesuai tujuan: <b>{DIET_GOAL_LABEL[goal]}</b>.
                  </p>
                </div>

                <div className="mt-6 border-t border-stone-100 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Coba Cepat Contoh Makanan:</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {[
                      'Ayam bakar + nasi + lalapan',
                      'Gado-gado telur rebus',
                      'Soto ayam bening tanpa santan',
                      'Nasi goreng spesial telur',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => {
                          setFood(example)
                          setImage(null)
                        }}
                        className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-900"
                      >
                        + {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
                Setelah hasil keluar, klik <b>"Catat ke makanan hari ini"</b> agar langsung terakumulasi ke grafik progres harianmu.
              </div>
            </Card>
          )}
          {result && v && (
            <Card className="fade-in space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-extrabold text-stone-900">{result.food_name}</p>
                  <p className="text-sm text-stone-500">Perkiraan untuk {result.portion}</p>
                </div>
                <Badge tone={source === 'ai' ? 'good' : 'warn'}>{source === 'ai' ? 'Analisis Gemini' : 'Perkiraan cadangan'}</Badge>
              </div>
              {notice && <p className="text-xs font-medium text-amber-700">{notice}</p>}

              <div className="flex items-center gap-4 rounded-2xl bg-stone-50 p-3">
                <ScoreRing score={result.score} className={v.ring} />
                <div>
                  <Badge tone={v.tone}>{v.label}</Badge>
                  <p className="mt-1.5 text-sm text-stone-700">{result.summary}</p>
                  <p className="mt-1 text-xs text-stone-500">Tujuan: {DIET_GOAL_LABEL[goal]}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Kalori', `${num(result.calories)} kkal`],
                  ['Protein', `${num(result.protein_g)} g`],
                  ['Karbohidrat', `${num(result.carbs_g)} g`],
                  ['Lemak', `${num(result.fat_g)} g`],
                ].map(([k, val]) => (
                  <div key={k} className="rounded-xl border border-stone-200 p-2.5 text-center">
                    <p className="text-xs text-stone-500">{k}</p>
                    <p className="font-extrabold text-stone-900">{val}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span>Serat <b>{num(result.fiber_g)} g</b></span>
                <span className="flex items-center gap-1">Gula <b>{num(result.sugar_g)} g</b> <Badge tone={LEVEL_TONE[result.sugar_level]}>{result.sugar_level}</Badge></span>
                <span className="flex items-center gap-1">Natrium <b>{num(result.sodium_mg)} mg</b> <Badge tone={LEVEL_TONE[result.sodium_level]}>{result.sodium_level}</Badge></span>
              </div>
              <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
                {logged ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-800">Sudah dicatat ke makanan hari ini.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/home')}>Lihat progres</Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-stone-700">
                      Jadi makan ini? Catat agar masuk progres <b>{GOALS[profile?.diet_goal ?? 'seimbang'].metricLabel.toLowerCase()}</b> harianmu.
                    </p>
                    <Button size="sm" loading={logging} icon={<NotebookPen className="size-4" />} onClick={logFood}>Catat ke makanan hari ini</Button>
                  </div>
                )}
              </div>

              {result.reasons.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-bold text-stone-800">Alasan</p>
                  <ul className="space-y-1.5">
                    {result.reasons.map((r) => <li key={r} className="flex gap-2 text-sm text-stone-700"><CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', v.ring)} />{r}</li>)}
                  </ul>
                </div>
              )}
              {result.tips.length > 0 && (
                <div className="rounded-xl bg-accent-50 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-accent-700"><Lightbulb className="size-4" /> Tips</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{result.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              )}
              <p className="text-xs text-stone-500">Angka gizi adalah perkiraan AI, bukan pengganti saran dokter atau ahli gizi.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
