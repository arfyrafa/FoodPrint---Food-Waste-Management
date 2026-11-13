// Logika progres diet customer (fungsi murni, ada unit test).
import type { DietGoal, FoodLog, WeightLog } from './types'
import { addDays } from './format'

export type Metric = 'calories' | 'protein_g' | 'sugar_g' | 'sodium_mg'

export interface GoalConfig {
  label: string
  focus: string // kalimat fokus singkat
  metric: Metric
  metricLabel: string
  unit: string
  defaultTarget: number
  /** lower = makin rendah makin baik (batas maksimal), higher = makin tinggi makin baik (target minimal), near = mendekati target */
  better: 'lower' | 'higher' | 'near'
  usesWeight: boolean
  tip: string
}

export const GOALS: Record<DietGoal, GoalConfig> = {
  turun_bb: {
    label: 'Turun berat badan', focus: 'Jaga kalori harian di bawah target', metric: 'calories', metricLabel: 'Kalori', unit: 'kkal',
    defaultTarget: 1800, better: 'lower', usesWeight: true, tip: 'Pilih lauk dibakar/rebus, perbanyak sayur, kurangi minuman manis.',
  },
  jaga_bb: {
    label: 'Jaga berat badan', focus: 'Kalori harian stabil di sekitar target', metric: 'calories', metricLabel: 'Kalori', unit: 'kkal',
    defaultTarget: 2100, better: 'near', usesWeight: true, tip: 'Makan teratur 3x sehari dengan porsi seimbang.',
  },
  naik_otot: {
    label: 'Naik massa otot', focus: 'Penuhi protein harian', metric: 'protein_g', metricLabel: 'Protein', unit: 'g',
    defaultTarget: 100, better: 'higher', usesWeight: true, tip: 'Tambahkan telur, tempe, tahu, ayam, atau ikan di setiap makan.',
  },
  rendah_gula: {
    label: 'Kurangi gula', focus: 'Gula harian di bawah batas', metric: 'sugar_g', metricLabel: 'Gula', unit: 'g',
    defaultTarget: 50, better: 'lower', usesWeight: false, tip: 'Ganti es teh manis dengan teh tawar atau air putih.',
  },
  rendah_garam: {
    label: 'Kurangi garam', focus: 'Natrium harian di bawah batas', metric: 'sodium_mg', metricLabel: 'Natrium', unit: 'mg',
    defaultTarget: 2000, better: 'lower', usesWeight: false, tip: 'Kurangi kuah, kecap, dan kerupuk.',
  },
  seimbang: {
    label: 'Makan seimbang', focus: 'Kalori cukup dan bergizi seimbang', metric: 'calories', metricLabel: 'Kalori', unit: 'kkal',
    defaultTarget: 2000, better: 'near', usesWeight: false, tip: 'Isi piring: setengah sayur & buah, seperempat nasi, seperempat lauk.',
  },
}

export interface DayTotal {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sugar_g: number
  sodium_mg: number
  items: number
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Total gizi per hari untuk rentang [from, to] (hari tanpa catatan bernilai 0 dengan items=0). */
export function dailyTotals(logs: Pick<FoodLog, 'log_date' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'sugar_g' | 'sodium_mg'>[], from: string, to: string): DayTotal[] {
  const out: DayTotal[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push({ date: d, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, sodium_mg: 0, items: 0 })
  }
  const byDate = new Map(out.map((d) => [d.date, d]))
  for (const l of logs) {
    const day = byDate.get(l.log_date)
    if (!day) continue
    day.calories += Number(l.calories) || 0
    day.protein_g += Number(l.protein_g) || 0
    day.carbs_g += Number(l.carbs_g) || 0
    day.fat_g += Number(l.fat_g) || 0
    day.sugar_g += Number(l.sugar_g) || 0
    day.sodium_mg += Number(l.sodium_mg) || 0
    day.items += 1
  }
  return out.map((d) => ({ ...d, calories: r1(d.calories), protein_g: r1(d.protein_g), carbs_g: r1(d.carbs_g), fat_g: r1(d.fat_g), sugar_g: r1(d.sugar_g), sodium_mg: Math.round(d.sodium_mg) }))
}

/** Apakah nilai satu hari memenuhi target sesuai arah tujuan. */
export function onTarget(value: number, target: number, better: GoalConfig['better']): boolean {
  if (better === 'lower') return value <= target
  if (better === 'higher') return value >= target
  return Math.abs(value - target) <= target * 0.1
}

export interface Trend {
  current: number | null // rata-rata 7 hari terakhir (hari yang ada catatan)
  previous: number | null // rata-rata 7 hari sebelumnya
  changePct: number | null
  direction: 'naik' | 'turun' | 'stabil' | null
  improving: boolean | null
  daysOnTarget: number
  daysLogged: number
}

/** Bandingkan rata-rata 7 hari terakhir vs 7 hari sebelumnya untuk metrik fokus. */
export function metricTrend(days: DayTotal[], metric: Metric, target: number, better: GoalConfig['better']): Trend {
  const logged = days.filter((d) => d.items > 0)
  const last7 = days.slice(-7).filter((d) => d.items > 0)
  const prev7 = days.slice(-14, -7).filter((d) => d.items > 0)
  const avg = (arr: DayTotal[]) => (arr.length ? r1(arr.reduce((a, d) => a + d[metric], 0) / arr.length) : null)
  const current = avg(last7)
  const previous = avg(prev7)
  let changePct: number | null = null
  let direction: Trend['direction'] = null
  let improving: boolean | null = null
  if (current !== null && previous !== null && previous > 0) {
    changePct = r1(((current - previous) / previous) * 100)
    direction = Math.abs(changePct) < 3 ? 'stabil' : changePct > 0 ? 'naik' : 'turun'
    if (better === 'lower') improving = direction === 'turun' || (direction === 'stabil' && current <= target)
    else if (better === 'higher') improving = direction === 'naik' || (direction === 'stabil' && current >= target)
    else improving = Math.abs(current - target) <= Math.abs(previous - target)
  }
  return {
    current, previous, changePct, direction, improving,
    daysOnTarget: last7.filter((d) => onTarget(d[metric], target, better)).length,
    daysLogged: logged.length,
  }
}

export interface WeightProgress {
  start: number | null
  latest: number | null
  target: number | null
  change: number | null // latest - start
  progressPct: number | null // 0-100 menuju target
}

export function weightProgress(logs: Pick<WeightLog, 'log_date' | 'weight_kg'>[], start: number | null, target: number | null): WeightProgress {
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const first = sorted[0] ? Number(sorted[0].weight_kg) : null
  const latest = sorted.at(-1) ? Number(sorted.at(-1)!.weight_kg) : null
  const s = start ?? first
  const change = s !== null && latest !== null ? r1(latest - s) : null
  let progressPct: number | null = null
  if (s !== null && latest !== null && target !== null && s !== target) {
    progressPct = Math.max(0, Math.min(100, Math.round(((s - latest) / (s - target)) * 100)))
  }
  return { start: s, latest, target, change, progressPct }
}
