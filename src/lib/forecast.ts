import type { Confidence } from './types'
import { weekday } from './format'

export interface HistoryPoint {
  date: string // YYYY-MM-DD
  produced: number
  sold: number
}

export interface ForecastResult {
  predictedSold: number
  recommended: number
  confidence: Confidence
  insufficient: boolean
  sampleSize: number
  /** Perubahan prediksi dibanding rata-rata seluruh penjualan menu (persen), null jika tidak bisa dihitung. */
  changePct: number | null
  lastProduction: number | null
  /** max(0, produksi terakhir di hari yang sama - rekomendasi) x HPP */
  estimatedSaving: number
}

export const BUFFER = 1.05
export const MAX_SAME_DAY_POINTS = 6

const round1 = (n: number) => Math.round(n * 10) / 10 || 0 // || 0 menghindari -0

/** ceil yang kebal galat floating point, misal 20 x 1.05 = 21.000000000000004 -> 21 */
export function safeCeil(n: number): number {
  return Math.ceil(Math.round(n * 1000) / 1000)
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

function coefficientOfVariation(values: number[]): number {
  const m = mean(values)
  if (m === 0) return values.every((v) => v === 0) ? 0 : Infinity
  const variance = mean(values.map((v) => (v - m) ** 2))
  return Math.sqrt(variance) / m
}

/**
 * Prediksi produksi untuk satu menu pada tanggal target (fungsi murni, sesuai PRD 6.2).
 * 1. Ambil maksimal 6 data terakhir pada hari yang sama (sebelum tanggal target).
 * 2. Rata-rata tertimbang (bobot 1..n, terbaru paling berat).
 * 3. Rekomendasi = ceil(prediksi x 1.05).
 * 4. Keyakinan: tinggi (n>=4 & CV<0.25), sedang (n>=3), rendah selain itu.
 * 5. Data hari yang sama < 2 -> pakai rata-rata seluruh data, tandai "Data belum cukup".
 */
export function forecastMenu(history: HistoryPoint[], targetDate: string, hpp: number): ForecastResult {
  const past = history.filter((h) => h.date < targetDate).sort((a, b) => a.date.localeCompare(b.date))
  const targetDow = weekday(targetDate)
  const sameDay = past.filter((h) => weekday(h.date) === targetDow).slice(-MAX_SAME_DAY_POINTS)
  const overallAvg = mean(past.map((h) => h.sold))

  let predicted: number
  let insufficient = false
  let confidence: Confidence

  if (sameDay.length >= 2) {
    const weights = sameDay.map((_, i) => i + 1)
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    predicted = sameDay.reduce((acc, h, i) => acc + h.sold * weights[i], 0) / totalWeight
    const cv = coefficientOfVariation(sameDay.map((h) => h.sold))
    confidence = sameDay.length >= 4 && cv < 0.25 ? 'tinggi' : sameDay.length >= 3 ? 'sedang' : 'rendah'
  } else {
    predicted = overallAvg
    insufficient = true
    confidence = 'rendah'
  }

  predicted = round1(predicted)
  const recommended = predicted > 0 ? safeCeil(predicted * BUFFER) : 0
  const lastRef = sameDay.at(-1) ?? past.at(-1) ?? null
  const lastProduction = lastRef ? lastRef.produced : null
  const changePct = overallAvg > 0 ? round1(((predicted - overallAvg) / overallAvg) * 100) + 0 : null
  const estimatedSaving = lastProduction !== null ? Math.max(0, lastProduction - recommended) * hpp : 0

  return {
    predictedSold: predicted,
    recommended,
    confidence,
    insufficient,
    sampleSize: sameDay.length,
    changePct,
    lastProduction,
    estimatedSaving,
  }
}
