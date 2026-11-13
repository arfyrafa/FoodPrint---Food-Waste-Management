// Penjelasan & perkiraan cadangan berbasis aturan, dipakai saat AI gagal / kuota habis.
// Tujuannya: halaman tidak pernah kosong walau Gemini tidak tersedia.
import type { AiText, DietGoal, NutritionResult } from './types'
import { rupiah } from './format'

export interface ForecastRowLite {
  menu: string
  predicted_sold: number
  recommended: number
  confidence: 'tinggi' | 'sedang' | 'rendah'
  change_pct: number | null
  last_production: number | null
  insufficient: boolean
}

export function forecastFallback(rows: ForecastRowLite[], dayName: string): AiText {
  const total = rows.reduce((a, r) => a + r.recommended, 0)
  const lower = rows.filter((r) => r.change_pct !== null && r.change_pct <= -10)
  const higher = rows.filter((r) => r.change_pct !== null && r.change_pct >= 10)
  const cut = rows
    .filter((r) => r.last_production !== null && r.last_production - r.recommended >= 3)
    .sort((a, b) => b.last_production! - b.recommended - (a.last_production! - a.recommended))
  const lacking = rows.filter((r) => r.insufficient)

  const parts = [`Untuk hari ${dayName}, sistem merekomendasikan total ${total} porsi dari ${rows.length} menu.`]
  if (lower.length) parts.push(`Permintaan ${lower.map((r) => r.menu).join(', ')} biasanya lebih rendah dari rata-rata pada hari ini.`)
  if (higher.length) parts.push(`${higher.map((r) => r.menu).join(', ')} cenderung lebih ramai dari biasanya.`)
  if (lacking.length) parts.push(`Data ${lacking.map((r) => r.menu).join(', ')} belum cukup, jadi angkanya memakai rata-rata keseluruhan.`)

  const actions: string[] = []
  for (const r of cut.slice(0, 2)) {
    actions.push(`Kurangi produksi ${r.menu} dari ${r.last_production} menjadi ${r.recommended} porsi.`)
  }
  if (lacking.length) actions.push('Isi catatan harian secara rutin agar prediksi makin akurat.')
  if (actions.length < 2) actions.push('Siapkan bahan tambahan secukupnya untuk menu yang paling laku bila stok cepat habis.')
  return { summary: parts.join(' '), actions: actions.slice(0, 3) }
}

export interface DailyFallbackInput {
  dayName: string
  totals: { produced: number; sold: number; leftover: number; loss: number; waste_pct: number; avg_waste_pct_30d: number | null }
  menus: { menu: string; produced: number; sold: number; leftover: number; loss: number }[]
}

export function dailyFallback({ dayName, totals, menus }: DailyFallbackInput): AiText {
  const worst = [...menus].sort((a, b) => b.loss - a.loss)[0]
  const best = [...menus].filter((m) => m.produced > 0).sort((a, b) => a.leftover / a.produced - b.leftover / b.produced)[0]
  const parts = [
    `Hari ${dayName}: ${totals.sold} dari ${totals.produced} porsi terjual, ${totals.leftover} porsi tersisa (${totals.waste_pct}%) dengan kerugian ${rupiah(totals.loss)}.`,
  ]
  if (totals.avg_waste_pct_30d !== null) {
    const diff = totals.waste_pct - totals.avg_waste_pct_30d
    parts.push(
      diff > 1
        ? `Waste lebih tinggi dari rata-rata 30 hari (${totals.avg_waste_pct_30d}%).`
        : diff < -1
          ? `Waste lebih rendah dari rata-rata 30 hari (${totals.avg_waste_pct_30d}%). Bagus!`
          : `Waste setara rata-rata 30 hari (${totals.avg_waste_pct_30d}%).`,
    )
  }
  if (worst && worst.loss > 0) parts.push(`Kerugian terbesar dari ${worst.menu} (${worst.leftover} porsi, ${rupiah(worst.loss)}).`)
  if (best) parts.push(`${best.menu} paling efisien hari ini.`)

  const actions: string[] = []
  if (worst && worst.leftover > 0) actions.push(`Kurangi produksi ${worst.menu} besok, ikuti angka di halaman Prediksi.`)
  if (totals.leftover > 0) actions.push('Pasang sisa yang masih layak di Surplus Food agar tetap terjual.')
  actions.push('Catat produksi dan sisa setiap hari supaya prediksi makin akurat.')
  return { summary: parts.join(' '), actions: actions.slice(0, 3) }
}

// ----------------- Cek gizi cadangan -----------------
interface FoodRef {
  keys: string[]
  name: string
  portion: string
  cal: number
  p: number
  c: number
  f: number
  fiber: number
  sugarG: number
  sodiumMg: number
  sugar: NutritionResult['sugar_level']
  sodium: NutritionResult['sodium_level']
  fried?: boolean
}

// Perkiraan kasar per porsi umum (referensi umum tabel komposisi pangan; hanya untuk cadangan).
const FOODS: FoodRef[] = [
  { keys: ['nasi ayam goreng', 'ayam goreng'], name: 'Nasi ayam goreng', sugarG: 3, sodiumMg: 900, portion: '1 piring', cal: 650, p: 30, c: 75, f: 25, fiber: 2, sugar: 'rendah', sodium: 'sedang', fried: true },
  { keys: ['nasi goreng'], name: 'Nasi goreng', sugarG: 6, sodiumMg: 1300, portion: '1 piring', cal: 600, p: 18, c: 80, f: 22, fiber: 2, sugar: 'sedang', sodium: 'tinggi', fried: true },
  { keys: ['mie goreng', 'mi goreng'], name: 'Mie goreng', sugarG: 7, sodiumMg: 1400, portion: '1 piring', cal: 550, p: 14, c: 70, f: 22, fiber: 3, sugar: 'sedang', sodium: 'tinggi', fried: true },
  { keys: ['mie ayam', 'mi ayam'], name: 'Mie ayam', sugarG: 5, sodiumMg: 1500, portion: '1 mangkuk', cal: 450, p: 20, c: 60, f: 14, fiber: 2, sugar: 'sedang', sodium: 'tinggi' },
  { keys: ['nasi telur', 'telur dadar', 'telur ceplok'], name: 'Nasi telur', sugarG: 2, sodiumMg: 700, portion: '1 piring', cal: 450, p: 15, c: 65, f: 14, fiber: 1, sugar: 'rendah', sodium: 'sedang', fried: true },
  { keys: ['soto'], name: 'Soto ayam', sugarG: 2, sodiumMg: 1400, portion: '1 mangkuk + nasi', cal: 400, p: 22, c: 50, f: 12, fiber: 2, sugar: 'rendah', sodium: 'tinggi' },
  { keys: ['gado', 'pecel', 'karedok'], name: 'Gado-gado', sugarG: 12, sodiumMg: 800, portion: '1 piring', cal: 380, p: 15, c: 35, f: 20, fiber: 8, sugar: 'sedang', sodium: 'sedang' },
  { keys: ['es teh', 'teh manis'], name: 'Es teh manis', sugarG: 28, sodiumMg: 10, portion: '1 gelas', cal: 120, p: 0, c: 30, f: 0, fiber: 0, sugar: 'tinggi', sodium: 'rendah' },
  { keys: ['teh tawar', 'air putih', 'air mineral'], name: 'Teh tawar / air putih', sugarG: 0, sodiumMg: 5, portion: '1 gelas', cal: 2, p: 0, c: 0, f: 0, fiber: 0, sugar: 'rendah', sodium: 'rendah' },
  { keys: ['bakso'], name: 'Bakso', sugarG: 3, sodiumMg: 1600, portion: '1 mangkuk', cal: 400, p: 20, c: 45, f: 15, fiber: 1, sugar: 'rendah', sodium: 'tinggi' },
  { keys: ['nasi padang', 'rendang'], name: 'Nasi rendang', sugarG: 4, sodiumMg: 1200, portion: '1 piring', cal: 700, p: 30, c: 70, f: 32, fiber: 2, sugar: 'rendah', sodium: 'tinggi' },
  { keys: ['pecel lele', 'lele'], name: 'Pecel lele', sugarG: 3, sodiumMg: 900, portion: '1 porsi + nasi', cal: 600, p: 28, c: 60, f: 26, fiber: 2, sugar: 'rendah', sodium: 'sedang', fried: true },
  { keys: ['tempe', 'tahu'], name: 'Tahu / tempe', sugarG: 1, sodiumMg: 400, portion: '2 potong', cal: 200, p: 12, c: 8, f: 13, fiber: 3, sugar: 'rendah', sodium: 'sedang', fried: true },
  { keys: ['sayur', 'capcay', 'tumis'], name: 'Sayur tumis', sugarG: 4, sodiumMg: 700, portion: '1 mangkuk', cal: 150, p: 5, c: 12, f: 8, fiber: 5, sugar: 'rendah', sodium: 'sedang' },
  { keys: ['gorengan', 'bakwan', 'pisang goreng'], name: 'Gorengan', sugarG: 5, sodiumMg: 500, portion: '2 buah', cal: 300, p: 4, c: 30, f: 18, fiber: 2, sugar: 'sedang', sodium: 'sedang', fried: true },
  { keys: ['buah', 'pisang', 'apel', 'pepaya'], name: 'Buah segar', sugarG: 15, sodiumMg: 5, portion: '1 porsi', cal: 90, p: 1, c: 22, f: 0, fiber: 3, sugar: 'sedang', sodium: 'rendah' },
  { keys: ['nasi putih', 'nasi'], name: 'Nasi putih', sugarG: 0, sodiumMg: 5, portion: '1 piring', cal: 250, p: 5, c: 55, f: 0, fiber: 1, sugar: 'rendah', sodium: 'rendah' },
]

export function nutritionFallback(food: string, goal: DietGoal): NutritionResult | null {
  const q = food.toLowerCase()
  const ref = FOODS.find((f) => f.keys.some((k) => q.includes(k)))
  if (!ref) return null

  let score = 70
  const reasons: string[] = []
  const tips: string[] = []
  if (goal === 'turun_bb') {
    if (ref.cal > 550) { score -= 25; reasons.push(`Kalorinya cukup tinggi (sekitar ${ref.cal} kkal).`) }
    if (ref.fried) { score -= 10; reasons.push('Diolah dengan digoreng sehingga lemaknya tinggi.') }
    if (ref.fiber >= 5) { score += 10; reasons.push('Seratnya tinggi sehingga lebih mengenyangkan.') }
    tips.push('Minta nasi setengah porsi dan tambah sayur.')
  } else if (goal === 'naik_otot') {
    if (ref.p >= 25) { score += 15; reasons.push(`Proteinnya bagus (sekitar ${ref.p} g).`) } else { score -= 15; reasons.push('Proteinnya masih rendah untuk menambah massa otot.') }
    tips.push('Tambah lauk protein seperti telur, tempe, atau ayam.')
  } else if (goal === 'rendah_gula') {
    if (ref.sugar === 'tinggi') { score -= 35; reasons.push('Kandungan gulanya tinggi.') }
    tips.push('Pilih minuman tanpa gula.')
  } else if (goal === 'rendah_garam') {
    if (ref.sodium === 'tinggi') { score -= 30; reasons.push('Kandungan garam/natriumnya tinggi (kuah atau bumbu).') }
    tips.push('Kurangi kuah dan sambal/kecap.')
  } else {
    if (ref.fiber < 3) { score -= 10; reasons.push('Kurang sayur dan serat.') }
    if (ref.fried) { score -= 5; reasons.push('Digoreng, sebaiknya tidak setiap hari.') }
    tips.push('Lengkapi dengan sayur dan buah agar gizi seimbang.')
  }
  if (!reasons.length) reasons.push('Komposisinya cukup wajar untuk tujuanmu.')
  tips.push('Angka ini perkiraan kasar, bukan saran medis.')
  score = Math.max(5, Math.min(95, score))

  return {
    is_food: true,
    food_name: ref.name,
    portion: ref.portion,
    calories: ref.cal,
    protein_g: ref.p,
    carbs_g: ref.c,
    fat_g: ref.f,
    fiber_g: ref.fiber,
    sugar_g: ref.sugarG,
    sodium_mg: ref.sodiumMg,
    sugar_level: ref.sugar,
    sodium_level: ref.sodium,
    verdict: score >= 70 ? 'baik' : score >= 45 ? 'cukup' : 'kurang',
    score,
    summary: `Perkiraan cadangan untuk ${ref.name.toLowerCase()} (${ref.portion}).`,
    reasons,
    tips,
  }
}
