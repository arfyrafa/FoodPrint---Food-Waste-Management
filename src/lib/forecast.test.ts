import { describe, expect, it } from 'vitest'
import { forecastMenu, safeCeil, type HistoryPoint } from './forecast'
import { addDays } from './format'

// 2026-11-20 adalah hari Jumat
const TARGET = '2026-11-20'
const fridays = (solds: number[], produced = 30): HistoryPoint[] =>
  solds.map((sold, i) => ({ date: addDays(TARGET, -7 * (solds.length - i)), produced, sold }))

describe('forecastMenu', () => {
  it('data cukup & stabil -> rata-rata tertimbang, keyakinan tinggi', () => {
    const r = forecastMenu(fridays([20, 20, 20, 20, 20, 20]), TARGET, 5000)
    expect(r.predictedSold).toBe(20)
    expect(r.recommended).toBe(21) // ceil(20 x 1.05) tanpa galat floating point
    expect(r.confidence).toBe('tinggi')
    expect(r.insufficient).toBe(false)
    expect(r.sampleSize).toBe(6)
    expect(r.estimatedSaving).toBe((30 - 21) * 5000)
  })

  it('data hari yang sama < 2 -> pakai rata-rata keseluruhan & tandai data belum cukup', () => {
    const history: HistoryPoint[] = [
      { date: '2026-11-16', produced: 40, sold: 30 }, // Senin
      { date: '2026-11-17', produced: 40, sold: 20 }, // Selasa
      { date: '2026-11-13', produced: 40, sold: 10 }, // Jumat (cuma 1)
    ]
    const r = forecastMenu(history, TARGET, 1000)
    expect(r.insufficient).toBe(true)
    expect(r.confidence).toBe('rendah')
    expect(r.predictedSold).toBe(20)
    expect(r.recommended).toBe(21)
  })

  it('tren naik -> data terbaru berbobot lebih besar', () => {
    const r = forecastMenu(fridays([10, 20, 30]), TARGET, 1000)
    // (10x1 + 20x2 + 30x3) / 6 = 23.3
    expect(r.predictedSold).toBe(23.3)
    expect(r.recommended).toBe(25)
    expect(r.predictedSold).toBeGreaterThan(20) // > rata-rata biasa
    expect(r.confidence).toBe('sedang')
  })

  it('nilai nol -> rekomendasi 0, tidak error', () => {
    const r = forecastMenu(fridays([0, 0, 0, 0]), TARGET, 1000)
    expect(r.predictedSold).toBe(0)
    expect(r.recommended).toBe(0)
    expect(r.changePct).toBeNull()
    expect(r.confidence).toBe('tinggi')
  })

  it('tanpa riwayat sama sekali', () => {
    const r = forecastMenu([], TARGET, 1000)
    expect(r.recommended).toBe(0)
    expect(r.lastProduction).toBeNull()
    expect(r.estimatedSaving).toBe(0)
  })

  it('mengabaikan data pada/tanggal setelah target & maksimal 6 data', () => {
    const history = [...fridays([5, 5, 5, 50, 50, 50, 50, 50, 50]), { date: TARGET, produced: 99, sold: 99 }]
    const r = forecastMenu(history, TARGET, 1000)
    expect(r.sampleSize).toBe(6)
    expect(r.predictedSold).toBe(50)
  })
})

describe('safeCeil', () => {
  it('kebal galat floating point', () => {
    expect(safeCeil(20 * 1.05)).toBe(21)
    expect(safeCeil(21.2)).toBe(22)
  })
})
