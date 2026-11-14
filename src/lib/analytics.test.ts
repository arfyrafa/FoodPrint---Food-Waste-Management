import { describe, expect, it } from 'vitest'
import { byWeekday, dailySeries, perMenu, summarize, toCsv } from './analytics'
import { dailyFallback, forecastFallback, nutritionFallback } from './fallback'

const menus = [
  { id: 'a', name: 'Nasi Ayam', price: 15000, hpp: 9000 },
  { id: 'b', name: 'Gado-Gado', price: 12000, hpp: 7000 },
]
const records = [
  { menu_id: 'a', record_date: '2026-11-16', produced: 40, sold: 38, leftover: 2 }, // Senin
  { menu_id: 'b', record_date: '2026-11-16', produced: 25, sold: 15, leftover: 10 },
  { menu_id: 'a', record_date: '2026-11-20', produced: 40, sold: 28, leftover: 12 }, // Jumat
]

describe('analytics', () => {
  it('summarize cocok dengan hitungan manual', () => {
    const s = summarize(records, menus)
    expect(s.produced).toBe(105)
    expect(s.leftover).toBe(24)
    expect(s.loss).toBe(2 * 9000 + 10 * 7000 + 12 * 9000) // 196.000
    expect(s.wastePct).toBe(22.9)
    expect(s.margin).toBe(38 * 6000 + 15 * 5000 + 28 * 6000)
    expect(s.net).toBe(s.margin - s.loss)
    // potensi hemat: a(40-ceil(39.9)=0) + b(25-ceil(15.75)=9)*7000 + a(40-ceil(29.4)=10)*9000
    expect(s.potentialSaving).toBe(9 * 7000 + 10 * 9000)
    expect(s.days).toBe(2)
  })

  it('perMenu diurutkan dari kerugian terbesar', () => {
    const m = perMenu(records, menus)
    expect(m[0].name).toBe('Nasi Ayam')
    expect(m[0].loss).toBe(14 * 9000)
    expect(m[1].wastePct).toBe(40)
  })

  it('dailySeries & byWeekday', () => {
    expect(dailySeries(records, menus).map((d) => d.leftover)).toEqual([12, 12])
    const w = byWeekday(records)
    expect(w.map((x) => x.dow)).toEqual([1, 5])
    expect(w[1].wastePct).toBe(30)
  })

  it('toCsv punya header & baris', () => {
    const csv = toCsv(records, menus).split('\n')
    expect(csv[0]).toContain('kerugian_waste')
    expect(csv).toHaveLength(4)
  })
})

describe('fallback', () => {
  it('forecastFallback menyebut menu yang perlu dikurangi', () => {
    const t = forecastFallback(
      [{ menu: 'Gado-Gado', predicted_sold: 11, recommended: 12, confidence: 'tinggi', change_pct: -30, last_production: 26, insufficient: false }],
      'Jumat',
    )
    expect(t.summary).toContain('Jumat')
    expect(t.actions[0]).toContain('Gado-Gado')
  })

  it('dailyFallback menghasilkan ringkasan', () => {
    const t = dailyFallback({
      dayName: 'Senin',
      totals: { produced: 65, sold: 53, leftover: 12, loss: 88000, waste_pct: 18.5, avg_waste_pct_30d: 12 },
      menus: [
        { menu: 'Nasi Ayam', produced: 40, sold: 38, leftover: 2, loss: 18000 },
        { menu: 'Gado-Gado', produced: 25, sold: 15, leftover: 10, loss: 70000 },
      ],
    })
    expect(t.summary).toContain('Gado-Gado')
    expect(t.actions.length).toBeGreaterThan(0)
  })

  it('nutritionFallback mengenali makanan umum & tujuan diet', () => {
    const r = nutritionFallback('Es Teh manis', 'rendah_gula')
    expect(r?.verdict).toBe('kurang')
    expect(nutritionFallback('gado gado', 'turun_bb')?.food_name).toBe('Gado-gado')
    expect(nutritionFallback('sesuatu aneh', 'seimbang')).toBeNull()
  })
})

import { toPoints } from '../components/AiInsight'
describe('toPoints', () => {
  it('memecah kalimat tanpa memecah angka', () => {
    expect(toPoints('Untuk hari Senin, total 235 porsi. Biaya Rp 1.500 per porsi turun 2,5%. Data Es Teh belum cukup.')).toEqual([
      'Untuk hari Senin, total 235 porsi',
      'Biaya Rp 1.500 per porsi turun 2,5%',
      'Data Es Teh belum cukup',
    ])
  })
})
