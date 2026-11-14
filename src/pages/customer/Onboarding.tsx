import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Candy, Dumbbell, HeartPulse, Scale, Soup, TrendingDown } from 'lucide-react'
import { BackLink, Logo } from '../../components/Layouts'
import { Alert, Button, Field, cn } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { GOALS } from '../../lib/diet'
import { todayISO } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { DietGoal } from '../../lib/types'

const ICONS: Record<DietGoal, React.ReactNode> = {
  turun_bb: <TrendingDown className="size-6" />,
  jaga_bb: <Scale className="size-6" />,
  naik_otot: <Dumbbell className="size-6" />,
  rendah_gula: <Candy className="size-6" />,
  rendah_garam: <Soup className="size-6" />,
  seimbang: <HeartPulse className="size-6" />,
}

const TILE: Record<DietGoal, string> = {
  turun_bb: 'bg-sky-100 text-sky-700',
  rendah_gula: 'bg-rose-100 text-rose-600',
  naik_otot: 'bg-accent-100 text-accent-600',
  jaga_bb: 'bg-brand-100 text-brand-700',
  rendah_garam: 'bg-amber-100 text-amber-700',
  seimbang: 'bg-violet-100 text-violet-700',
}

const ORDER: DietGoal[] = ['turun_bb', 'rendah_gula', 'naik_otot', 'jaga_bb', 'rendah_garam', 'seimbang']

/** Pertanyaan tujuan diet saat customer pertama kali login (atau saat mengubah tujuan). */
export default function Onboarding() {
  const { profile, refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [goal, setGoal] = useState<DietGoal>(profile?.diet_goal ?? 'turun_bb')
  const [weight, setWeight] = useState(profile?.start_weight ? String(profile.start_weight) : '')
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight ? String(profile.target_weight) : '')
  const [dailyTarget, setDailyTarget] = useState(String(profile?.daily_target ?? GOALS[profile?.diet_goal ?? 'turun_bb'].defaultTarget))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const cfg = GOALS[goal]
  const firstTime = !profile?.onboarded

  // isi berat sekarang dengan catatan berat terakhir (jika ada)
  useEffect(() => {
    if (!profile) return
    supabase.from('weight_logs').select('weight_kg').eq('user_id', profile.id).order('log_date', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => data && setWeight(String(Number(data.weight_kg))))
  }, [profile])

  function pick(g: DietGoal) {
    setGoal(g)
    setDailyTarget(String(g === profile?.diet_goal && profile?.daily_target ? profile.daily_target : GOALS[g].defaultTarget))
  }

  async function finish() {
    setError('')
    const w = weight ? Number(weight.replace(',', '.')) : null
    const tw = targetWeight ? Number(targetWeight.replace(',', '.')) : null
    const dt = Number(dailyTarget)
    if (w !== null && (!Number.isFinite(w) || w < 20 || w > 300)) return setError('Berat badan harus 20–300 kg.')
    if (tw !== null && (!Number.isFinite(tw) || tw < 20 || tw > 300)) return setError('Target berat harus 20–300 kg.')
    if (!Number.isFinite(dt) || dt < 1 || dt > 10000) return setError('Target harian tidak valid.')
    setBusy(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        diet_goal: goal,
        daily_target: Math.round(dt),
        onboarded: true,
        // berat awal hanya diisi sekali agar progres tetap dihitung dari titik mulai
        start_weight: profile?.start_weight ?? (cfg.usesWeight ? w : null),
        target_weight: cfg.usesWeight ? tw : profile?.target_weight ?? null,
      })
      .eq('id', profile!.id)
    if (!err && cfg.usesWeight && w !== null) {
      await supabase.from('weight_logs').upsert({ user_id: profile!.id, log_date: todayISO(), weight_kg: w }, { onConflict: 'user_id,log_date' })
    }
    setBusy(false)
    if (err) return setError(friendlyError(err))
    await refresh()
    navigate('/home', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-cream px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="-ml-2.5">
            {step === 2 ? (
              <BackLink label="Kembali" onClick={() => setStep(1)} />
            ) : profile?.onboarded ? (
              <BackLink to="/home" label="Kembali ke beranda" />
            ) : (
              <BackLink to="/" label="Kembali" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-stone-500">Langkah {step} dari 2</span>
            <button
              onClick={async () => {
                navigate('/')
                await signOut()
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-stone-600 hover:bg-white"
            >
              Keluar
            </button>
          </div>
        </div>

        {step === 1 ? (
          <div className="fade-in">
            <Logo size="sm" to={profile?.onboarded ? '/home' : '/'} />
            <h1 className="mt-4 text-2xl font-extrabold text-brand-900 sm:text-3xl">
              {firstTime ? `Halo${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! Apa tujuan makanmu?` : 'Ubah tujuan makanmu'}
            </h1>
            <p className="mt-2 text-stone-600">FoodPrint akan memfokuskan dashboard, cek gizi, dan progresmu sesuai tujuan ini.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {ORDER.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => pick(g)}
                  aria-pressed={goal === g}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-colors',
                    goal === g ? 'border-brand-600 bg-brand-50' : 'border-stone-200 hover:border-stone-300',
                  )}
                >
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', goal === g ? 'bg-brand-700 text-white' : TILE[g])}>{ICONS[g]}</span>
                  <span>
                    <span className="block font-bold text-stone-900">{GOALS[g].label}</span>
                    <span className="block text-sm text-stone-600">{GOALS[g].focus}</span>
                  </span>
                </button>
              ))}
            </div>
            <Button className="mt-6 w-full" size="lg" onClick={() => setStep(2)} icon={<ArrowRight className="size-4" />}>Lanjut</Button>
          </div>
        ) : (
          <div className="fade-in">
            <h1 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">Fokus: {cfg.label}</h1>
            <p className="mt-2 text-stone-600">Atur targetmu. Angka bawaan adalah acuan umum dan bisa kamu ubah kapan saja di Profil.</p>
            <div className="card mt-6 space-y-4 p-5">
              {error && <Alert tone="danger">{error}</Alert>}
              <Field
                label={`Target ${cfg.metricLabel.toLowerCase()} per hari (${cfg.unit})`}
                htmlFor="dtarget"
                hint={cfg.better === 'lower' ? `Batas maksimal per hari. ${cfg.tip}` : cfg.better === 'higher' ? `Target minimal per hari. ${cfg.tip}` : cfg.tip}
              >
                <input id="dtarget" className="input" inputMode="numeric" value={dailyTarget} onChange={(e) => /^\d{0,5}$/.test(e.target.value) && setDailyTarget(e.target.value)} />
              </Field>
              {cfg.usesWeight && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Berat sekarang (kg)" htmlFor="w">
                    <input id="w" className="input" inputMode="decimal" placeholder="contoh 70" value={weight} onChange={(e) => /^\d{0,3}([.,]\d?)?$/.test(e.target.value) && setWeight(e.target.value)} />
                  </Field>
                  <Field label="Target berat (kg)" htmlFor="tw">
                    <input id="tw" className="input" inputMode="decimal" placeholder="contoh 65" value={targetWeight} onChange={(e) => /^\d{0,3}([.,]\d?)?$/.test(e.target.value) && setTargetWeight(e.target.value)} />
                  </Field>
                </div>
              )}
              <p className="text-xs text-stone-500">FoodPrint bukan pengganti saran dokter atau ahli gizi. Jika punya kondisi kesehatan khusus, konsultasikan targetmu dengan tenaga kesehatan.</p>
            </div>
            <Button className="mt-6 w-full" size="lg" loading={busy} onClick={finish}>Mulai</Button>
          </div>
        )}
      </div>
    </div>
  )
}
