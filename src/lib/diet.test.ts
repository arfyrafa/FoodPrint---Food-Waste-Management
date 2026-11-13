import { describe, expect, it } from 'vitest'
import { dailyTotals, metricTrend, onTarget, weightProgress } from './diet'

const log = (log_date: string, sugar_g: number, calories = 500) => ({ log_date, calories, protein_g: 10, carbs_g: 50, fat_g: 10, sugar_g, sodium_mg: 500 })

describe('diet', () => {
  it('dailyTotals mengisi hari kosong & menjumlah per hari', () => {
    const days = dailyTotals([log('2026-11-10', 20), log('2026-11-10', 15), log('2026-11-12', 5)], '2026-11-10', '2026-11-12')
    expect(days.map((d) => d.sugar_g)).toEqual([35, 0, 5])
    expect(days[1].items).toBe(0)
  })

  it('metricTrend: gula turun = membaik untuk tujuan kurangi gula', () => {
    const logs = []
    for (let i = 0; i < 14; i++) {
      const d = `2026-11-${String(i + 1).padStart(2, '0')}`
      logs.push(log(d, i < 7 ? 60 : 40))
    }
    const t = metricTrend(dailyTotals(logs, '2026-11-01', '2026-11-14'), 'sugar_g', 50, 'lower')
    expect(t.previous).toBe(60)
    expect(t.current).toBe(40)
    expect(t.direction).toBe('turun')
    expect(t.improving).toBe(true)
    expect(t.daysOnTarget).toBe(7)
  })

  it('metricTrend: protein naik = membaik untuk naik otot', () => {
    const logs = [
      { ...log('2026-11-01', 0), protein_g: 60 },
      { ...log('2026-11-10', 0), protein_g: 90 },
    ]
    const t = metricTrend(dailyTotals(logs, '2026-11-01', '2026-11-14'), 'protein_g', 100, 'higher')
    expect(t.direction).toBe('naik')
    expect(t.improving).toBe(true)
  })

  it('metricTrend tanpa data minggu lalu -> tidak ada perbandingan', () => {
    const t = metricTrend(dailyTotals([log('2026-11-14', 30)], '2026-11-01', '2026-11-14'), 'sugar_g', 50, 'lower')
    expect(t.changePct).toBeNull()
    expect(t.current).toBe(30)
  })

  it('onTarget sesuai arah', () => {
    expect(onTarget(40, 50, 'lower')).toBe(true)
    expect(onTarget(40, 50, 'higher')).toBe(false)
    expect(onTarget(2050, 2000, 'near')).toBe(true)
  })

  it('weightProgress menghitung kemajuan menuju target', () => {
    const p = weightProgress([{ log_date: '2026-11-01', weight_kg: 72 }, { log_date: '2026-11-14', weight_kg: 69.5 }], 72, 65)
    expect(p.change).toBe(-2.5)
    expect(p.progressPct).toBe(36)
  })
})
