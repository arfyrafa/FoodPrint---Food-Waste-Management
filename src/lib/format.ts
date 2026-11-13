const rupiahFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

export const rupiah = (n: number) => rupiahFmt.format(Math.round(n)).replace(/ /g, ' ')
export const num = (n: number) => numberFmt.format(n)
export const pct = (n: number) => `${numberFmt.format(n)}%`

export function rupiahShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}Rp${numberFmt.format(abs / 1_000_000)} jt`
  if (abs >= 1_000) return `${sign}Rp${numberFmt.format(abs / 1_000)} rb`
  return `${sign}Rp${Math.round(abs)}`
}

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** Tanggal hari ini (zona WIB) dalam format YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 3600_000)
  return wib.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = Minggu ... 6 = Sabtu */
export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

export const dayName = (iso: string) => DAY_NAMES[weekday(iso)]

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', { ...opts, timeZone: 'UTC' })
}

export function formatDateLong(iso: string) {
  return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  })
}

export function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
}

/** Sisa waktu relatif, contoh "2 jam 15 mnt lagi". */
export function timeLeft(ts: string, now = Date.now()): string {
  const diff = new Date(ts).getTime() - now
  if (diff <= 0) return 'Sudah lewat'
  const mins = Math.floor(diff / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h} jam ${m} mnt lagi` : `${m} mnt lagi`
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  if (digits.length < 9) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
