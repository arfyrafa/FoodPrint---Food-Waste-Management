import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  HandPlatter,
  Minus,
  Pencil,
  Salad,
  Scale,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  TrendingUp,
} from 'lucide-react'
import { DietMetricChart, WeightChart } from '../../components/charts'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, EmptyState, PageSkeleton, cn } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { useAsync } from '../../lib/data'
import { GOALS, dailyTotals, metricTrend, onTarget, weightProgress } from '../../lib/diet'
import { addDays, formatDateLong, num, todayISO } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { FoodLog, WeightLog } from '../../lib/types'

const VERDICT_TONE = { baik: 'good', cukup: 'warn', kurang: 'danger' } as const

export default function CustomerHome() {
  const { profile } = useAuth()
  const toast = useToast()
  const today = todayISO()
  const from = addDays(today, -13)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const [foods, weights] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', profile!.id).gte('log_date', from).order('created_at'),
      supabase.from('weight_logs').select('*').eq('user_id', profile!.id).order('log_date'),
    ])
    if (foods.error) throw new Error(friendlyError(foods.error))
    if (weights.error) throw new Error(friendlyError(weights.error))
    return { foods: (foods.data ?? []) as FoodLog[], weights: (weights.data ?? []) as WeightLog[] }
  }, [profile?.id, from])

  const goal = profile?.diet_goal ?? 'seimbang'
  const cfg = GOALS[goal]
  const target = profile?.daily_target ?? cfg.defaultTarget

  const view = useMemo(() => {
    if (!data) return null
    const days = dailyTotals(data.foods, from, today)
    const todayTotal = days.at(-1)!
    return {
      days,
      todayTotal,
      todayFoods: data.foods.filter((f) => f.log_date === today),
      trend: metricTrend(days, cfg.metric, target, cfg.better),
      weight: weightProgress(data.weights, profile?.start_weight ?? null, profile?.target_weight ?? null),
    }
  }, [data, from, today, cfg, target, profile?.start_weight, profile?.target_weight])

  if (profile && !profile.onboarded) return <Navigate to="/onboarding" replace />
  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>
  if (!view || !profile) return null

  const todayValue = view.todayTotal[cfg.metric]
  const pctOfTarget = Math.min(100, Math.round((todayValue / target) * 100))
  const todayOk = onTarget(todayValue, target, cfg.better)
  const t = view.trend
  const showWeight = cfg.usesWeight || (data?.weights.length ?? 0) > 0
  const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'Mahasiswa'

  async function saveWeight(e: FormEvent) {
    e.preventDefault()
    const w = Number(weightInput.replace(',', '.'))
    if (!Number.isFinite(w) || w < 20 || w > 300) return toast('Berat badan harus 20–300 kg.', 'error')
    setSavingWeight(true)
    const { error: err } = await supabase
      .from('weight_logs')
      .upsert({ user_id: profile!.id, log_date: today, weight_kg: Math.round(w * 10) / 10 }, { onConflict: 'user_id,log_date' })
    setSavingWeight(false)
    if (err) return toast(friendlyError(err), 'error')
    setWeightInput('')
    toast('Berat badan hari ini berhasil dicatat.')
    reload()
  }

  async function removeFood(f: FoodLog) {
    const { error: err } = await supabase.from('food_logs').delete().eq('id', f.id)
    if (err) return toast(friendlyError(err), 'error')
    toast(`${f.food_name} dihapus dari catatan.`)
    reload()
  }

  const TrendIcon = t.direction === 'naik' ? ArrowUpRight : t.direction === 'turun' ? ArrowDownRight : Minus

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: Personal & Actionable */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-800 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">
              <Sparkles className="size-3.5 text-accent-400" />
              Target Nutrisi Harian Mahasiswa
            </div>
            <h1 className="mt-2.5 text-2xl font-extrabold sm:text-3xl">
              Semangat hari ini, {firstName}! 🥗
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-brand-100 sm:text-base">
              Fokus: <b className="text-white">{cfg.label}</b> ({cfg.focus}: {cfg.better === 'lower' ? 'maks.' : cfg.better === 'higher' ? 'min.' : 'sekitar'} {num(target)} {cfg.unit} per hari).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/nutrition"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-4 font-semibold text-white shadow-sm transition hover:bg-accent-600"
            >
              <Salad className="size-4" />
              Cek Gizi Makanan
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Pencil className="size-3.5" />
              Ubah
            </Link>
          </div>
        </div>

        {/* Tip Ringan */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-white/10 px-4 py-3 text-xs leading-relaxed text-brand-50 sm:text-sm">
          <Target className="mt-0.5 size-4 shrink-0 text-accent-300" />
          <span><b>Tips dietmu:</b> {cfg.tip}</span>
        </div>
      </div>

      {/* 2. GRID UTAMA: Hari Ini & Tren */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* KARTU 1: Hari Ini */}
        <Card className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Utensils className="size-4" />
                </div>
                <div>
                  <h2 className="font-bold text-stone-900">Konsumsi Hari Ini</h2>
                  <p className="text-xs text-stone-500">{formatDateLong(today)}</p>
                </div>
              </div>
              {view.todayTotal.items > 0 && (
                <Badge tone={todayOk ? 'good' : 'warn'}>
                  {todayOk ? 'Sesuai Target' : cfg.better === 'higher' ? 'Belum Tercapai' : 'Melebihi Target'}
                </Badge>
              )}
            </div>

            {/* Metrik Porsi */}
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-stone-900">{num(todayValue)}</span>
                <span className="ml-1.5 text-sm font-medium text-stone-500">/ {num(target)} {cfg.unit}</span>
              </div>
              <span className="text-xs font-bold text-brand-700">{pctOfTarget}% Tercapai</span>
            </div>

            {/* Progress Bar Visual */}
            <div
              className="mt-2.5 h-3 overflow-hidden rounded-full bg-stone-100"
              role="progressbar"
              aria-valuenow={pctOfTarget}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  cfg.better === 'lower' && todayValue > target ? 'bg-accent-500' : 'bg-brand-600',
                )}
                style={{ width: `${Math.max(pctOfTarget, todayValue > 0 ? 4 : 0)}%` }}
              />
            </div>

            {/* Daftar Makanan yang Dicatat Hari Ini */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Catatan Makanan ({view.todayFoods.length})</p>
              {view.todayFoods.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-5 text-center">
                  <p className="text-sm font-medium text-stone-700">Belum ada makanan yang dicatat hari ini.</p>
                  <p className="mt-1 text-xs text-stone-500">Cek gizi sarapan atau makan siangmu agar tercatat rapi di sini.</p>
                </div>
              ) : (
                <ul className="mt-2.5 divide-y divide-stone-100">
                  {view.todayFoods.map((f) => (
                    <li key={f.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="truncate font-semibold text-stone-800">{f.food_name}</p>
                        <p className="text-xs text-stone-500">{f.portion || '1 porsi'} · {num(Number(f[cfg.metric]))} {cfg.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.verdict && <Badge tone={VERDICT_TONE[f.verdict]}>{f.verdict}</Badge>}
                        <button
                          type="button"
                          onClick={() => removeFood(f)}
                          className="grid size-8 place-items-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Hapus ${f.food_name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 pt-2">
            <Link
              to="/nutrition"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white shadow-xs transition hover:bg-brand-800"
            >
              <Salad className="size-4" />
              + Catat Makanan Baru (Cek Gizi)
            </Link>
          </div>
        </Card>

        {/* KARTU 2: Tren 14 Hari */}
        <Card className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h2 className="font-bold text-stone-900">Tren Nutrisi Harian</h2>
                  <p className="text-xs text-stone-500">14 hari terakhir ({cfg.metricLabel})</p>
                </div>
              </div>
            </div>

            {t.daysLogged === 0 ? (
              <EmptyState
                icon={<Salad className="size-6" />}
                title="Belum ada riwayat makanan"
              >
                Cek gizi makananmu lalu klik "Catat ke makanan hari ini" untuk mulai melihat grafik tren mingguan.
              </EmptyState>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <p className="text-xs text-stone-500">Rata-rata 7 Hari</p>
                    <p className="mt-0.5 text-xl font-extrabold text-stone-900">
                      {t.current !== null ? `${num(t.current)} ${cfg.unit}` : '-'}
                    </p>
                    {t.changePct !== null && (
                      <p className={cn('mt-1 flex items-center gap-1 text-xs font-semibold', t.improving ? 'text-brand-700' : 'text-accent-600')}>
                        <TrendIcon className="size-3.5 shrink-0" />
                        {t.direction === 'stabil' ? 'Stabil' : `${t.direction === 'naik' ? 'Naik' : 'Turun'} ${num(Math.abs(t.changePct))}% vs mggu lalu`}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <p className="text-xs text-stone-500">Konsistensi Target</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xl font-extrabold text-stone-900">
                      <CalendarCheck className="size-5 text-brand-600" />
                      {t.daysOnTarget}/7 Hari
                    </p>
                    <p className="mt-1 text-xs text-stone-500">dalam seminggu terakhir</p>
                  </div>
                </div>

                {t.improving !== null && (
                  <div className={cn('mt-3.5 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed font-medium', t.improving ? 'bg-brand-50 text-brand-800' : 'bg-accent-50 text-accent-800')}>
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {t.improving
                        ? `Bagus sekali! Pola ${cfg.metricLabel.toLowerCase()} kamu bergerak ke arah target.`
                        : `${cfg.metricLabel} kamu menjauh dari target minggu ini. Perhatikan porsi ya!`}
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <DietMetricChart
                    days={view.days}
                    metric={cfg.metric}
                    unit={cfg.unit}
                    label={cfg.metricLabel}
                    target={target}
                    better={cfg.better}
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 3. BANNER KHUSUS: Penyelamatan Makanan Surplus */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-accent-200 bg-gradient-to-r from-accent-50 via-white to-accent-50/60 p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-xs">
            <HandPlatter className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-stone-900 sm:text-lg">
              Cari Makanan Murah Hari Ini?
            </h3>
            <p className="text-xs text-stone-600 sm:text-sm">
              Selamatkan porsi berlebih berkualitas dari kantin kampus. Diskon hingga 50% atau gratis!
            </p>
          </div>
        </div>

        <Link
          to="/surplus"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-accent-700 active:scale-[0.98]"
        >
          Lihat Makanan Surplus
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* 4. TRACKER BERAT BADAN (Jika target relevan dengan BB) */}
      {showWeight && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                <Scale className="size-4" />
              </div>
              <div>
                <h2 className="font-bold text-stone-900">Progres Berat Badan</h2>
                <p className="text-xs text-stone-500">
                  {view.weight.latest !== null ? (
                    <>
                      Terkini: <b className="text-stone-900">{num(view.weight.latest)} kg</b>
                      {view.weight.change !== null && view.weight.change !== 0 && (
                        <span> · {view.weight.change < 0 ? 'turun' : 'naik'} <b>{num(Math.abs(view.weight.change))} kg</b> sejak awal ({num(view.weight.start!)} kg)</span>
                      )}
                      {view.weight.target !== null && <span> · Target: <b>{num(view.weight.target)} kg</b></span>}
                    </>
                  ) : (
                    'Catat berat badanmu secara rutin untuk memantau progres.'
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={saveWeight} className="flex items-center gap-2">
              <input
                className="input h-10 w-28 text-center text-sm font-semibold"
                inputMode="decimal"
                placeholder="kg hari ini"
                aria-label="Berat hari ini (kg)"
                value={weightInput}
                onChange={(e) => /^\d{0,3}([.,]\d?)?$/.test(e.target.value) && setWeightInput(e.target.value)}
              />
              <Button type="submit" size="sm" loading={savingWeight}>
                Catat
              </Button>
            </form>
          </div>

          {view.weight.progressPct !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-stone-600">
                <span>Menuju Target Berat</span>
                <span>{view.weight.progressPct}%</span>
              </div>
              <div
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone-100"
                role="progressbar"
                aria-valuenow={view.weight.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${view.weight.progressPct}%` }}
                />
              </div>
            </div>
          )}

          {(data?.weights.length ?? 0) >= 2 && (
            <div className="mt-5">
              <WeightChart data={data!.weights} target={view.weight.target} />
            </div>
          )}
        </Card>
      )}

      <p className="text-center text-xs text-stone-400">
        Perkiraan gizi dihitung oleh AI berdasarkan standar nutrisi umum, bukan pengganti saran dokter atau ahli gizi profesional.
      </p>
    </div>
  )
}
