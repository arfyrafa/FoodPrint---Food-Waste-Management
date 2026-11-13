import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, CalendarCheck, Lightbulb, Minus, Pencil, Salad, Scale, ShoppingBag, Target, Trash2 } from 'lucide-react'
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

  async function saveWeight(e: FormEvent) {
    e.preventDefault()
    const w = Number(weightInput.replace(',', '.'))
    if (!Number.isFinite(w) || w < 20 || w > 300) return toast('Berat badan harus 20–300 kg.', 'error')
    setSavingWeight(true)
    const { error: err } = await supabase.from('weight_logs').upsert({ user_id: profile!.id, log_date: today, weight_kg: Math.round(w * 10) / 10 }, { onConflict: 'user_id,log_date' })
    setSavingWeight(false)
    if (err) return toast(friendlyError(err), 'error')
    setWeightInput('')
    toast('Berat hari ini dicatat.')
    reload()
  }

  async function removeFood(f: FoodLog) {
    const { error: err } = await supabase.from('food_logs').delete().eq('id', f.id)
    if (err) return toast(friendlyError(err), 'error')
    reload()
  }

  const TrendIcon = t.direction === 'naik' ? ArrowUpRight : t.direction === 'turun' ? ArrowDownRight : Minus

  return (
    <div className="space-y-5">
      {/* Fokus tujuan */}
      <div className="overflow-hidden rounded-3xl bg-brand-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-brand-200">Halo, {profile.full_name.split(' ')[0] || 'kamu'}! Fokusmu saat ini</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold sm:text-3xl"><Target className="size-6 text-accent-300" /> {cfg.label}</h1>
            <p className="mt-1 text-brand-100">
              {cfg.focus}: {cfg.better === 'lower' ? 'maks.' : cfg.better === 'higher' ? 'min.' : 'sekitar'} <b>{num(target)} {cfg.unit}</b> per hari
            </p>
          </div>
          <Link to="/onboarding" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
            <Pencil className="size-4" /> Ubah tujuan
          </Link>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-brand-50"><Lightbulb className="mt-0.5 size-4 shrink-0 text-accent-300" /> {cfg.tip}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Hari ini */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-stone-900">Hari ini</h2>
            <span className="text-xs text-stone-500">{formatDateLong(today)}</span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <p className="text-3xl font-extrabold text-stone-900">
              {num(todayValue)} <span className="text-base font-semibold text-stone-500">/ {num(target)} {cfg.unit}</span>
            </p>
            {view.todayTotal.items > 0 && <Badge tone={todayOk ? 'good' : 'warn'}>{todayOk ? 'Sesuai target' : cfg.better === 'higher' ? 'Belum tercapai' : 'Melebihi target'}</Badge>}
          </div>
          <p className="text-sm text-stone-500">{cfg.metricLabel} dari makanan yang kamu catat</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={pctOfTarget} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={cn('h-full rounded-full', cfg.better === 'lower' && todayValue > target ? 'bg-accent-500' : 'bg-brand-600')}
              style={{ width: `${Math.max(pctOfTarget, todayValue > 0 ? 3 : 0)}%` }}
            />
          </div>
          <ul className="mt-4 divide-y divide-stone-100">
            {view.todayFoods.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex-1 font-medium text-stone-800">{f.food_name}</span>
                <span className="text-stone-500">{num(Number(f[cfg.metric]))} {cfg.unit}</span>
                {f.verdict && <Badge tone={VERDICT_TONE[f.verdict]}>{f.verdict}</Badge>}
                <button onClick={() => removeFood(f)} className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label={`Hapus ${f.food_name}`}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {view.todayFoods.length === 0 && <p className="mt-3 text-sm text-stone-500">Belum ada makanan yang dicatat hari ini.</p>}
          <Link to="/nutrition" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800">
            <Salad className="size-4" /> Cek gizi & catat makanan
          </Link>
        </Card>

        {/* Tren 7 hari */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-stone-900">Progres {cfg.metricLabel.toLowerCase()} 14 hari</h2>
          {t.daysLogged === 0 ? (
            <EmptyState icon={<Salad className="size-6" />} title="Belum ada catatan makan">Cek gizi makananmu lalu klik "Catat ke makanan hari ini" untuk mulai melihat progres.</EmptyState>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Rata-rata 7 hari terakhir</p>
                  <p className="text-xl font-extrabold text-stone-900">{t.current !== null ? `${num(t.current)} ${cfg.unit}` : '-'}</p>
                  {t.changePct !== null && (
                    <>
                      <p className={cn('mt-0.5 flex items-center gap-1 text-sm font-semibold', t.improving ? 'text-brand-700' : 'text-accent-600')}>
                        <TrendIcon className="size-4 shrink-0" />
                        {t.direction === 'stabil' ? 'Stabil' : `${t.direction === 'naik' ? 'Naik' : 'Turun'} ${num(Math.abs(t.changePct))}%`}
                      </p>
                      <p className="text-xs text-stone-500">vs minggu lalu ({num(t.previous!)} {cfg.unit})</p>
                    </>
                  )}
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Hari sesuai target</p>
                  <p className="flex items-center gap-1.5 text-xl font-extrabold text-stone-900"><CalendarCheck className="size-5 text-brand-600" /> {t.daysOnTarget}/7</p>
                  <p className="mt-0.5 text-xs text-stone-500">dalam 7 hari terakhir</p>
                </div>
              </div>
              {t.improving !== null && (
                <p className={cn('mt-3 rounded-xl px-3 py-2 text-sm font-medium', t.improving ? 'bg-brand-50 text-brand-800' : 'bg-accent-50 text-accent-700')}>
                  {t.improving ? `Bagus! ${cfg.metricLabel} kamu bergerak ke arah tujuan.` : `${cfg.metricLabel} kamu menjauh dari tujuan minggu ini. ${cfg.tip}`}
                </p>
              )}
              <div className="mt-3">
                <DietMetricChart days={view.days} metric={cfg.metric} unit={cfg.unit} label={cfg.metricLabel} target={target} />
              </div>
            </>
          )}
        </Card>
      </div>

      {showWeight && (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-stone-900"><Scale className="size-4" /> Berat badan</h2>
              {view.weight.latest !== null ? (
                <p className="mt-1 text-sm text-stone-600">
                  Sekarang <b className="text-stone-900">{num(view.weight.latest)} kg</b>
                  {view.weight.change !== null && view.weight.change !== 0 && (
                    <> · {view.weight.change < 0 ? 'turun' : 'naik'} <b>{num(Math.abs(view.weight.change))} kg</b> sejak mulai ({num(view.weight.start!)} kg)</>
                  )}
                  {view.weight.target !== null && <> · target <b>{num(view.weight.target)} kg</b></>}
                </p>
              ) : (
                <p className="mt-1 text-sm text-stone-600">Catat berat badan secara rutin untuk melihat progres.</p>
              )}
            </div>
            <form onSubmit={saveWeight} className="flex gap-2">
              <input className="input w-28" inputMode="decimal" placeholder="kg hari ini" aria-label="Berat hari ini (kg)" value={weightInput} onChange={(e) => /^\d{0,3}([.,]\d?)?$/.test(e.target.value) && setWeightInput(e.target.value)} />
              <Button type="submit" loading={savingWeight}>Catat</Button>
            </form>
          </div>
          {view.weight.progressPct !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-stone-500"><span>Menuju target</span><span>{view.weight.progressPct}%</span></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={view.weight.progressPct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${view.weight.progressPct}%` }} />
              </div>
            </div>
          )}
          {(data?.weights.length ?? 0) >= 2 && (
            <div className="mt-4">
              <WeightChart data={data!.weights} target={view.weight.target} />
            </div>
          )}
        </Card>
      )}

      <Link to="/surplus" className="card flex items-center gap-3 p-4 hover:bg-stone-50">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-50 text-accent-600"><ShoppingBag className="size-5" /></span>
        <span className="flex-1">
          <span className="block font-bold text-stone-900">Makanan surplus hari ini</span>
          <span className="block text-sm text-stone-600">Hemat sekaligus bantu kurangi food waste. Cek gizinya sebelum pesan.</span>
        </span>
      </Link>
      <p className="text-center text-xs text-stone-400">Angka gizi adalah perkiraan, bukan pengganti saran dokter atau ahli gizi.</p>
    </div>
  )
}
