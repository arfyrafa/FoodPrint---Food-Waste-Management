export type Role = 'owner' | 'customer'
export type BusinessType = 'kantin' | 'restoran' | 'umkm' | 'katering'
export type DietGoal = 'seimbang' | 'turun_bb' | 'jaga_bb' | 'naik_otot' | 'rendah_gula' | 'rendah_garam'
export type FoodCategory = 'karbohidrat' | 'protein' | 'sayur' | 'lauk_lain' | 'minuman' | 'lainnya'
export type OrderStatus = 'pending' | 'confirmed' | 'picked_up' | 'cancelled'
export type Confidence = 'tinggi' | 'sedang' | 'rendah'

export interface Profile {
  id: string
  role: Role
  full_name: string
  phone: string | null
  diet_goal: DietGoal
  diet_notes: string | null
  onboarded: boolean
  start_weight: number | null
  target_weight: number | null
  /** target harian metrik fokus (kkal / g protein / g gula / mg natrium) */
  daily_target: number | null
}

export interface FoodLog {
  id: string
  user_id: string
  log_date: string
  food_name: string
  portion: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sugar_g: number
  sodium_mg: number
  verdict: 'baik' | 'cukup' | 'kurang' | null
  score: number | null
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  log_date: string
  weight_kg: number
}

export interface Outlet {
  id: string
  owner_id: string
  business_name: string
  business_type: BusinessType
  address: string | null
  whatsapp: string | null
}

export interface Menu {
  id: string
  outlet_id: string
  name: string
  price: number
  hpp: number
  unit: string
  is_active: boolean
}

export interface DailyRecord {
  id?: string
  outlet_id: string
  menu_id: string
  record_date: string // YYYY-MM-DD
  produced: number
  sold: number
  leftover: number
}

export interface VisionItem {
  name: string
  category: FoodCategory
  estimated_portions: number
  confidence: number
}

export interface VisionResult {
  is_food: boolean
  items: VisionItem[]
  notes: string
}

export interface WasteLog {
  id: string
  outlet_id: string
  log_date: string
  source: 'manual' | 'ai_vision'
  items: (VisionItem & { menu_id?: string | null })[]
  notes: string | null
  created_at: string
}

export interface SurplusListing {
  id: string
  outlet_id: string
  menu_id: string | null
  title: string
  quantity: number
  remaining_qty: number
  price: number
  original_price: number | null
  pickup_until: string
  location_note: string | null
  safety_confirmed: boolean
  is_active: boolean
  created_at: string
}

export interface PublicSurplus {
  id: string
  title: string
  remaining_qty: number
  quantity: number
  price: number
  original_price: number | null
  pickup_until: string
  location_note: string | null
  created_at: string
  outlet_id: string
  business_name: string
  business_type: BusinessType
  address: string | null
  whatsapp: string | null
}

export interface Order {
  id: string
  code: string
  listing_id: string | null
  outlet_id: string
  customer_id: string
  customer_name: string
  customer_phone: string | null
  item_title: string
  quantity: number
  unit_price: number
  total_price: number
  status: OrderStatus
  pickup_until: string
  note: string | null
  created_at: string
}

export interface AiText {
  summary: string
  actions: string[]
}

export interface NutritionResult {
  is_food: boolean
  food_name: string
  portion: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  sugar_level: 'rendah' | 'sedang' | 'tinggi'
  sodium_level: 'rendah' | 'sedang' | 'tinggi'
  verdict: 'baik' | 'cukup' | 'kurang'
  score: number
  summary: string
  reasons: string[]
  tips: string[]
}

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  kantin: 'Kantin',
  restoran: 'Restoran',
  umkm: 'UMKM Kuliner',
  katering: 'Katering',
}

export const DIET_GOAL_LABEL: Record<DietGoal, string> = {
  seimbang: 'Makan seimbang',
  turun_bb: 'Turun berat badan',
  jaga_bb: 'Jaga berat badan',
  naik_otot: 'Naik massa otot',
  rendah_gula: 'Kurangi gula',
  rendah_garam: 'Kurangi garam',
}

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  karbohidrat: 'Karbohidrat',
  protein: 'Protein',
  sayur: 'Sayur',
  lauk_lain: 'Lauk lain',
  minuman: 'Minuman',
  lainnya: 'Lainnya',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Siap diambil',
  picked_up: 'Selesai',
  cancelled: 'Dibatalkan',
}
