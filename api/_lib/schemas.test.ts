import { describe, expect, it } from 'vitest'
import { visionRequest, visionResult } from './schemas'

const sample = {
  is_food: true,
  food_name: 'Soto ayam',
  portion: '1 mangkuk',
  calories: 320,
  composition: { protein_pct: 30, carbs_pct: 45, fat_pct: 22, fiber_pct: 3 },
  micronutrients: [{ name: 'Vitamin A', akg_pct: 15 }],
  safety: { status: 'periksa', confidence: 0.55, signs: ['Kuah agak keruh'], advice: 'Cium baunya dulu.' },
  sugar_level: 'rendah',
  notes: '',
}

describe('vision schema', () => {
  it('menerima jawaban Gemini yang valid', () => {
    expect(visionResult.safeParse(sample).success).toBe(true)
  })
  it('status kelayakan tak dikenal menjadi "periksa"', () => {
    const r = visionResult.parse({ ...sample, safety: { ...sample.safety, status: 'aman' } })
    expect(r.safety.status).toBe('periksa')
  })
  it('menolak persentase di luar 0-100', () => {
    expect(visionResult.safeParse({ ...sample, composition: { ...sample.composition, fat_pct: 150 } }).success).toBe(false)
  })
  it('request: hint opsional', () => {
    expect(visionRequest.safeParse({ image: 'data:image/jpeg;base64,AAAA' }).success).toBe(true)
  })
})
