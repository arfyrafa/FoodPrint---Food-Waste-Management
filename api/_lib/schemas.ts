import { z } from 'zod'

// ---------- Vision: analisis gizi & kelayakan satu makanan dari foto ----------
export const visionRequest = z.object({
  image: z.string().max(6_000_000),
  hint: z.string().max(120).optional(), // nama makanan (opsional) untuk membantu AI
})

const level = z.enum(['rendah', 'sedang', 'tinggi']).catch('sedang')

export const visionResult = z.object({
  is_food: z.boolean(),
  food_name: z.string().max(120),
  portion: z.string().max(80),
  calories: z.number().min(0).max(5000),
  // persentase energi dari tiap zat gizi makro (dinormalisasi agar total 100)
  composition: z.object({
    protein_pct: z.number().min(0).max(100),
    carbs_pct: z.number().min(0).max(100),
    fat_pct: z.number().min(0).max(100),
    fiber_pct: z.number().min(0).max(100),
  }),
  micronutrients: z
    .array(z.object({ name: z.string().max(40), akg_pct: z.number().min(0).max(500) }))
    .max(6),
  safety: z.object({
    status: z.enum(['layak', 'periksa', 'tidak_layak']).catch('periksa'),
    confidence: z.number().min(0).max(1),
    signs: z.array(z.string().max(160)).max(5),
    advice: z.string().max(300),
  }),
  sugar_level: level,
  notes: z.string().max(300).catch(''),
})

export const visionGeminiSchema = {
  type: 'OBJECT',
  properties: {
    is_food: { type: 'BOOLEAN' },
    food_name: { type: 'STRING' },
    portion: { type: 'STRING' },
    calories: { type: 'NUMBER' },
    composition: {
      type: 'OBJECT',
      properties: {
        protein_pct: { type: 'NUMBER' },
        carbs_pct: { type: 'NUMBER' },
        fat_pct: { type: 'NUMBER' },
        fiber_pct: { type: 'NUMBER' },
      },
      required: ['protein_pct', 'carbs_pct', 'fat_pct', 'fiber_pct'],
    },
    micronutrients: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, akg_pct: { type: 'NUMBER' } }, required: ['name', 'akg_pct'] },
    },
    safety: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', enum: ['layak', 'periksa', 'tidak_layak'] },
        confidence: { type: 'NUMBER' },
        signs: { type: 'ARRAY', items: { type: 'STRING' } },
        advice: { type: 'STRING' },
      },
      required: ['status', 'confidence', 'signs', 'advice'],
    },
    sugar_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi'] },
    notes: { type: 'STRING' },
  },
  required: ['is_food', 'food_name', 'portion', 'calories', 'composition', 'micronutrients', 'safety', 'sugar_level', 'notes'],
}

// ---------- Explain: penjelasan prediksi & kesimpulan harian ----------
const forecastRow = z.object({
  menu: z.string().max(80),
  predicted_sold: z.number(),
  recommended: z.number(),
  confidence: z.enum(['tinggi', 'sedang', 'rendah']),
  change_pct: z.number().nullable(),
  last_production: z.number().nullable(),
  insufficient: z.boolean(),
})

const dailyMenu = z.object({
  menu: z.string().max(80),
  produced: z.number(),
  sold: z.number(),
  leftover: z.number(),
  loss: z.number(),
})

export const explainRequest = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('forecast'),
    outlet: z.string().max(100),
    target_date: z.string().max(20),
    day_name: z.string().max(20),
    rows: z.array(forecastRow).min(1).max(60),
  }),
  z.object({
    mode: z.literal('daily'),
    outlet: z.string().max(100),
    date: z.string().max(20),
    day_name: z.string().max(20),
    totals: z.object({
      produced: z.number(),
      sold: z.number(),
      leftover: z.number(),
      loss: z.number(),
      waste_pct: z.number(),
      avg_waste_pct_30d: z.number().nullable(),
    }),
    menus: z.array(dailyMenu).min(1).max(60),
  }),
])

export const explainResult = z.object({
  summary: z.string().max(1200),
  actions: z.array(z.string().max(300)).min(1).max(4),
})

export const explainGeminiSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    actions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'actions'],
}

// ---------- Nutrition: cek gizi untuk customer ----------
export const DIET_GOALS = ['seimbang', 'turun_bb', 'jaga_bb', 'naik_otot', 'rendah_gula', 'rendah_garam'] as const

export const nutritionRequest = z
  .object({
    food: z.string().max(120).optional().default(''),
    image: z.string().max(6_000_000).optional(),
    goal: z.enum(DIET_GOALS),
    notes: z.string().max(200).optional().default(''),
  })
  .refine((v) => v.food.trim().length > 0 || Boolean(v.image), { message: 'Isi nama makanan atau unggah foto' })

export const nutritionResult = z.object({
  is_food: z.boolean(),
  food_name: z.string().max(120),
  portion: z.string().max(80),
  calories: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500),
  carbs_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(500),
  fiber_g: z.number().min(0).max(200),
  sugar_g: z.number().min(0).max(500),
  sodium_mg: z.number().min(0).max(10000),
  sugar_level: level,
  sodium_level: level,
  verdict: z.enum(['baik', 'cukup', 'kurang']).catch('cukup'),
  score: z.number().min(0).max(100),
  summary: z.string().max(600),
  reasons: z.array(z.string().max(250)).max(5),
  tips: z.array(z.string().max(250)).max(5),
})

export const nutritionGeminiSchema = {
  type: 'OBJECT',
  properties: {
    is_food: { type: 'BOOLEAN' },
    food_name: { type: 'STRING' },
    portion: { type: 'STRING' },
    calories: { type: 'NUMBER' },
    protein_g: { type: 'NUMBER' },
    carbs_g: { type: 'NUMBER' },
    fat_g: { type: 'NUMBER' },
    fiber_g: { type: 'NUMBER' },
    sugar_g: { type: 'NUMBER' },
    sodium_mg: { type: 'NUMBER' },
    sugar_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi'] },
    sodium_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi'] },
    verdict: { type: 'STRING', enum: ['baik', 'cukup', 'kurang'] },
    score: { type: 'NUMBER' },
    summary: { type: 'STRING' },
    reasons: { type: 'ARRAY', items: { type: 'STRING' } },
    tips: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'is_food', 'food_name', 'portion', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg',
    'sugar_level', 'sodium_level', 'verdict', 'score', 'summary', 'reasons', 'tips',
  ],
}

export const GOAL_LABEL: Record<(typeof DIET_GOALS)[number], string> = {
  seimbang: 'makan seimbang / umum',
  turun_bb: 'menurunkan berat badan (defisit kalori)',
  jaga_bb: 'menjaga berat badan',
  naik_otot: 'menambah massa otot (butuh protein tinggi)',
  rendah_gula: 'membatasi gula',
  rendah_garam: 'membatasi garam / natrium',
}
