import type { DailyRecord, Menu } from './types'
import { BUFFER, safeCeil } from './forecast'
import { weekday } from './format'

type MenuLite = Pick<Menu, 'id' | 'name' | 'price' | 'hpp'>
type RecordLite = Pick<DailyRecord, 'menu_id' | 'record_date' | 'produced' | 'sold' | 'leftover'>

export interface Summary {
  produced: number
  sold: number
  leftover: number
  /** Kerugian waste = sisa x HPP */
  loss: number
  wastePct: number
  revenue: number
  /** Laba kotor penjualan = terjual x (harga - HPP) */
  margin: number
  /** Laba bersih setelah waste = margin - loss */
  net: number
  /** Potensi hemat jika produksi = ceil(terjual x 1.05) */
  potentialSaving: number
  days: number
}

export interface MenuStat {
  menuId: string
  name: string
  produced: number
  sold: number
  leftover: number
  revenue: number
  margin: number
  loss: number
  net: number
  wastePct: number
}

export interface DayPoint {
  date: string
  produced: number
  sold: number
  leftover: number
  loss: number
  wastePct: number
}

export interface WeekdayPoint {
  dow: number
  avgLeftover: number
  wastePct: number
  days: number
}

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)

function menuMap(menus: MenuLite[]) {
  return new Map(menus.map((m) => [m.id, m]))
}

function recordMoney(r: RecordLite, m: MenuLite | undefined) {
  const price = m?.price ?? 0
  const hpp = m?.hpp ?? 0
  const loss = r.leftover * hpp
  const margin = r.sold * (price - hpp)
  const saving = Math.max(0, r.produced - safeCeil(r.sold * BUFFER)) * hpp
  return { revenue: r.sold * price, margin, loss, saving }
}

export function summarize(records: RecordLite[], menus: MenuLite[]): Summary {
  const map = menuMap(menus)
  const s = { produced: 0, sold: 0, leftover: 0, loss: 0, revenue: 0, margin: 0, potentialSaving: 0 }
  const dates = new Set<string>()
  for (const r of records) {
    const money = recordMoney(r, map.get(r.menu_id))
    s.produced += r.produced
    s.sold += r.sold
    s.leftover += r.leftover
    s.loss += money.loss
    s.revenue += money.revenue
    s.margin += money.margin
    s.potentialSaving += money.saving
    dates.add(r.record_date)
  }
  return { ...s, net: s.margin - s.loss, wastePct: pctOf(s.leftover, s.produced), days: dates.size }
}

export function perMenu(records: RecordLite[], menus: MenuLite[]): MenuStat[] {
  const map = menuMap(menus)
  const stats = new Map<string, MenuStat>()
  for (const r of records) {
    const m = map.get(r.menu_id)
    const cur =
      stats.get(r.menu_id) ??
      { menuId: r.menu_id, name: m?.name ?? 'Menu terhapus', produced: 0, sold: 0, leftover: 0, revenue: 0, margin: 0, loss: 0, net: 0, wastePct: 0 }
    const money = recordMoney(r, m)
    cur.produced += r.produced
    cur.sold += r.sold
    cur.leftover += r.leftover
    cur.revenue += money.revenue
    cur.margin += money.margin
    cur.loss += money.loss
    stats.set(r.menu_id, cur)
  }
  return [...stats.values()]
    .map((s) => ({ ...s, net: s.margin - s.loss, wastePct: pctOf(s.leftover, s.produced) }))
    .sort((a, b) => b.loss - a.loss)
}

export function dailySeries(records: RecordLite[], menus: MenuLite[]): DayPoint[] {
  const map = menuMap(menus)
  const days = new Map<string, DayPoint>()
  for (const r of records) {
    const cur = days.get(r.record_date) ?? { date: r.record_date, produced: 0, sold: 0, leftover: 0, loss: 0, wastePct: 0 }
    cur.produced += r.produced
    cur.sold += r.sold
    cur.leftover += r.leftover
    cur.loss += r.leftover * (map.get(r.menu_id)?.hpp ?? 0)
    days.set(r.record_date, cur)
  }
  return [...days.values()]
    .map((d) => ({ ...d, wastePct: pctOf(d.leftover, d.produced) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Rata-rata sisa per hari dalam seminggu (Senin..Minggu), hanya hari yang punya data. */
export function byWeekday(records: RecordLite[]): WeekdayPoint[] {
  const acc = new Map<number, { leftover: number; produced: number; dates: Set<string> }>()
  for (const r of records) {
    const dow = weekday(r.record_date)
    const cur = acc.get(dow) ?? { leftover: 0, produced: 0, dates: new Set<string>() }
    cur.leftover += r.leftover
    cur.produced += r.produced
    cur.dates.add(r.record_date)
    acc.set(dow, cur)
  }
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order
    .filter((d) => acc.has(d))
    .map((dow) => {
      const a = acc.get(dow)!
      return {
        dow,
        avgLeftover: Math.round((a.leftover / a.dates.size) * 10) / 10,
        wastePct: pctOf(a.leftover, a.produced),
        days: a.dates.size,
      }
    })
}

/** Ekspor CSV ringkasan per menu dan per hari. */
export function toCsv(records: RecordLite[], menus: MenuLite[]): string {
  const map = menuMap(menus)
  const header = ['tanggal', 'menu', 'diproduksi', 'terjual', 'sisa', 'harga_jual', 'hpp', 'kerugian_waste', 'laba_kotor']
  const rows = [...records]
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((r) => {
      const m = map.get(r.menu_id)
      const money = recordMoney(r, m)
      return [r.record_date, m?.name ?? '-', r.produced, r.sold, r.leftover, m?.price ?? 0, m?.hpp ?? 0, money.loss, money.margin]
    })
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}
