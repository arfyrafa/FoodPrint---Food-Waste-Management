// =====================================================================
// MODE DEMO LOKAL
// Dipakai otomatis jika VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi.
// Meniru sebagian kecil API supabase-js dengan data contoh di localStorage,
// supaya web bisa dicoba tanpa server. BUKAN untuk production.
// =====================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>
type Db = Record<string, Row[]>

const STORAGE_KEY = 'foodprint-demo-db-v2'
const SESSION_KEY = 'foodprint-demo-session-v1'

export const DEMO_PASSWORD = 'demo123'
export const DEMO_OWNER_EMAIL = 'demo@foodprint.id'
export const DEMO_CUSTOMER_EMAIL = 'pembeli@foodprint.id'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
const nowIso = () => new Date().toISOString()

function wibToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}
function addDays(iso: string, d: number) {
  const x = new Date(`${iso}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + d)
  return x.toISOString().slice(0, 10)
}
function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

/** Data contoh: 1 kantin, 6 menu, 8 minggu catatan hari kerja (pola sama dengan seed.sql). */
function buildSeed(): Db {
  const ownerId = 'demo-owner'
  const customerId = 'demo-customer'
  const outletId = 'demo-outlet'
  const users = [
    { id: ownerId, email: DEMO_OWNER_EMAIL, password: DEMO_PASSWORD },
    { id: customerId, email: DEMO_CUSTOMER_EMAIL, password: DEMO_PASSWORD },
  ]
  const profiles = [
    { id: ownerId, role: 'owner', full_name: 'Pengelola Kantin Demo', phone: '6281200000001', diet_goal: 'seimbang', diet_notes: null, onboarded: true, start_weight: null, target_weight: null, daily_target: null },
    // onboarded false: saat login pertama, customer demo ditanya dulu tujuan dietnya
    { id: customerId, role: 'customer', full_name: 'Mahasiswa Demo', phone: '6281200000002', diet_goal: 'turun_bb', diet_notes: 'Tidak terlalu suka pedas', onboarded: false, start_weight: 72, target_weight: 65, daily_target: null },
  ]
  const outlets = [
    { id: outletId, owner_id: ownerId, business_name: 'Kantin Kampus Demo', business_type: 'kantin', address: 'Gedung A lantai 1, dekat parkiran motor', whatsapp: '6281200000001', created_at: nowIso() },
  ]
  const menuDefs: [string, number, number, number, number][] = [
    ['Nasi Ayam Goreng', 15000, 9000, 40, 44],
    ['Mie Goreng', 12000, 6500, 30, 33],
    ['Nasi Telur', 10000, 5500, 35, 38],
    ['Soto Ayam', 13000, 7500, 22, 32],
    ['Gado-Gado', 12000, 7000, 16, 26],
    ['Es Teh', 4000, 1500, 55, 60],
  ]
  const menus: Row[] = []
  const daily_records: Row[] = []
  const today = wibToday()
  menuDefs.forEach(([name, price, hpp, demand, production], i) => {
    const id = `demo-menu-${i}`
    menus.push({ id, outlet_id: outletId, name, price, hpp, unit: 'porsi', is_active: true, created_at: `2026-01-0${i + 1}T00:00:00Z` })
    for (let k = -56; k <= 0; k++) {
      const day = addDays(today, k)
      const dow = new Date(`${day}T00:00:00Z`).getUTCDay()
      if (dow === 0 || dow === 6) continue
      const factor = ({ 1: 1.2, 2: 1, 3: 1.15, 4: 1, 5: 0.7 } as Record<number, number>)[dow]
      const produced = production + (hash(day + name) % 5) - 2
      const sold = Math.max(0, Math.min(produced, Math.round(demand * factor) + (hash(name + day) % 7) - 3))
      daily_records.push({ id: uid(), outlet_id: outletId, menu_id: id, record_date: day, produced, sold, leftover: produced - sold, created_at: nowIso(), updated_at: nowIso() })
    }
  })
  const in4h = new Date(Date.now() + 4 * 3600_000).toISOString()
  const in3h = new Date(Date.now() + 3 * 3600_000).toISOString()
  const surplus_listings = [
    { id: 'demo-listing-1', outlet_id: outletId, menu_id: 'demo-menu-4', title: 'Gado-Gado (sisa siang)', quantity: 8, remaining_qty: 6, price: 5000, original_price: 12000, pickup_until: in4h, location_note: 'Ambil di kasir Kantin Kampus Demo, sebutkan kode pesanan', safety_confirmed: true, is_active: true, created_at: nowIso() },
    { id: 'demo-listing-2', outlet_id: outletId, menu_id: 'demo-menu-3', title: 'Soto Ayam porsi bungkus', quantity: 6, remaining_qty: 6, price: 0, original_price: 13000, pickup_until: in3h, location_note: 'Gratis untuk mahasiswa, bawa wadah sendiri lebih baik', safety_confirmed: true, is_active: true, created_at: nowIso() },
  ]
  const orders = [
    { id: uid(), code: 'FP-DEMO01', listing_id: 'demo-listing-1', outlet_id: outletId, customer_id: customerId, customer_name: 'Mahasiswa Demo', customer_phone: '6281200000002', item_title: 'Gado-Gado (sisa siang)', quantity: 2, unit_price: 5000, total_price: 10000, status: 'pending', pickup_until: in4h, note: null, created_at: nowIso(), updated_at: nowIso() },
  ]
  // Progres diet customer demo: berat turun perlahan, minggu lalu lebih banyak gula & kalori
  const weight_logs: Row[] = []
  for (let d = 28; d >= 0; d -= 3) {
    weight_logs.push({ id: uid(), user_id: customerId, log_date: addDays(today, -d), weight_kg: Math.round((72 - (28 - d) * 0.09 + ((hash(String(d)) % 5) - 2) * 0.1) * 10) / 10, created_at: nowIso() })
  }
  const foods: [string, string, number, number, number, number, number, number, string, number][] = [
    ['Nasi telur', '1 piring', 450, 15, 65, 14, 2, 700, 'cukup', 62],
    ['Gado-gado', '1 piring', 380, 15, 35, 20, 12, 800, 'baik', 78],
    ['Es teh manis', '1 gelas', 120, 0, 30, 0, 28, 10, 'kurang', 35],
  ]
  const food_logs: Row[] = []
  for (let d = 13; d >= 0; d--) {
    for (const [name, portion, cal, p, c, f, sugar, na, verdict, score] of foods) {
      if (hash(name + d) % 4 === 0) continue
      const lastWeek = d >= 7
      food_logs.push({
        id: uid(), user_id: customerId, log_date: addDays(today, -d), food_name: name, portion,
        calories: Math.round(cal * (lastWeek ? 1.15 : 1)), protein_g: p, carbs_g: c, fat_g: f,
        sugar_g: Math.round(sugar * (lastWeek ? 1.6 : 1) * 10) / 10, sodium_mg: na, verdict, score, created_at: nowIso(),
      })
    }
  }
  return { users, profiles, outlets, menus, daily_records, surplus_listings, orders, food_logs, weight_logs, ai_usage: [], ai_insights: [], _meta: [{ seeded: today }] }
}

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const db = JSON.parse(raw) as Db
      // Data contoh dibuat ulang tiap hari agar tanggal & listing surplus tetap segar
      if (db._meta?.[0]?.seeded === wibToday()) return db
    }
  } catch {
    /* abaikan, buat ulang */
  }
  const db = buildSeed()
  saveDb(db)
  return db
}
function saveDb(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* penyimpanan penuh / diblokir: tetap jalan di memori */
  }
}

let db: Db = loadDb()
const persist = () => saveDb(db)

export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY)
  db = loadDb()
}

// ---------------- Auth ----------------
type Session = { access_token: string; user: { id: string; email: string } }
type Listener = (event: string, session: Session | null) => void
const listeners = new Set<Listener>()

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}
function writeSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
  setTimeout(() => listeners.forEach((l) => l(s ? 'SIGNED_IN' : 'SIGNED_OUT', s)), 0)
}
const currentUserId = () => readSession()?.user.id ?? null
const err = (message: string) => ({ message })

const auth = {
  async getSession() {
    return { data: { session: readSession() }, error: null }
  },
  async getUser() {
    const s = readSession()
    return { data: { user: s?.user ?? null }, error: null }
  },
  onAuthStateChange(cb: Listener) {
    listeners.add(cb)
    setTimeout(() => cb('INITIAL_SESSION', readSession()), 0)
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user || user.password !== password) return { data: { session: null, user: null }, error: err('Invalid login credentials') }
    const session = { access_token: `demo-${user.id}`, user: { id: user.id, email: user.email } }
    writeSession(session)
    return { data: { session, user: session.user }, error: null }
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) {
    if (password.length < 6) return { data: { session: null, user: null }, error: err('Password should be at least 6 characters') }
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { data: { session: null, user: null }, error: err('User already registered') }
    const meta = options?.data ?? {}
    const id = uid()
    const role = meta.role === 'owner' ? 'owner' : 'customer'
    db.users.push({ id, email, password })
    db.profiles.push({ id, role, full_name: meta.full_name ?? '', phone: null, diet_goal: 'seimbang', diet_notes: null, onboarded: false, start_weight: null, target_weight: null, daily_target: null })
    if (role === 'owner') {
      db.outlets.push({ id: uid(), owner_id: id, business_name: meta.business_name || 'Usaha Saya', business_type: meta.business_type || 'kantin', address: null, whatsapp: null, created_at: nowIso() })
    }
    persist()
    const session = { access_token: `demo-${id}`, user: { id, email } }
    writeSession(session)
    return { data: { session, user: session.user }, error: null }
  },
  async signOut() {
    writeSession(null)
    return { error: null }
  },
  /** Mode demo: email tidak benar-benar dikirim. Selalu sukses agar tidak membocorkan email terdaftar. */
  async resetPasswordForEmail(_email: string, _opts?: { redirectTo?: string }) {
    await new Promise((r) => setTimeout(r, 300))
    return { data: {}, error: null }
  },
  async updateUser(attrs: { password?: string }) {
    const s = readSession()
    if (!s) return { data: { user: null }, error: err('Auth session missing!') }
    const user = db.users.find((u) => u.id === s.user.id)
    if (!user) return { data: { user: null }, error: err('User not found') }
    if (attrs.password !== undefined) {
      if (attrs.password.length < 6) return { data: { user: null }, error: err('Password should be at least 6 characters') }
      if (attrs.password === user.password) return { data: { user: null }, error: err('New password should be different from the old password.') }
      user.password = attrs.password
      persist()
    }
    return { data: { user: s.user }, error: null }
  },
}

/** Mode demo: meniru klik link reset di email (langsung masuk sesi pemulihan). */
export function startDemoRecovery(email: string): boolean {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return false
  writeSession({ access_token: `demo-${user.id}`, user: { id: user.id, email: user.email } })
  return true
}

// ---------------- Row Level Security sederhana ----------------
function myOutletIds(): Set<string> {
  const me = currentUserId()
  return new Set(db.outlets.filter((o) => o.owner_id === me).map((o) => o.id))
}
function canSee(table: string, row: Row): boolean {
  const me = currentUserId()
  if (table === 'public_surplus') return true
  if (!me) return false
  if (table === 'profiles') return row.id === me
  if (table === 'outlets') return row.owner_id === me
  if (table === 'orders') return row.customer_id === me || myOutletIds().has(row.outlet_id)
  if (['ai_usage', 'food_logs', 'weight_logs'].includes(table)) return row.user_id === me
  return myOutletIds().has(row.outlet_id)
}

function publicSurplus(): Row[] {
  const now = Date.now()
  return db.surplus_listings
    .filter((s) => s.is_active && s.safety_confirmed && new Date(s.pickup_until).getTime() > now && s.remaining_qty > 0)
    .map((s) => {
      const o = db.outlets.find((x) => x.id === s.outlet_id) ?? {}
      return {
        id: s.id, title: s.title, remaining_qty: s.remaining_qty, quantity: s.quantity, price: s.price, original_price: s.original_price,
        pickup_until: s.pickup_until, location_note: s.location_note, created_at: s.created_at,
        outlet_id: o.id, business_name: o.business_name, business_type: o.business_type, address: o.address, whatsapp: o.whatsapp,
        photo_url: s.photo_url ?? db.menus.find((m) => m.id === s.menu_id)?.photo_url ?? null,
      }
    })
}

// ---------------- Query builder ----------------
/** Nilai default kolom (meniru DEFAULT di schema.sql). */
const TABLE_DEFAULTS: Record<string, Row> = {
  menus: { is_active: true, unit: 'porsi', photo_url: null },
  surplus_listings: { is_active: true, safety_confirmed: false, price: 0, menu_id: null, photo_url: null },
  food_logs: { portion: null, verdict: null, score: null, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, sodium_mg: 0 },
}

type Filter = (r: Row) => boolean
type Result = { data: any; error: { message: string } | null; count?: number | null }

class Query implements PromiseLike<Result> {
  private filters: Filter[] = []
  private orderBy: { col: string; asc: boolean }[] = []
  private from_ = 0
  private to_: number | null = null
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private conflict: string[] = []
  private returning = false
  private single_: 'one' | 'maybe' | null = null
  private headCount = false
  private table: string

  constructor(table: string) {
    this.table = table
  }

  private cols: string[] | null = null

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode !== 'select') this.returning = true
    if (opts?.head) this.headCount = true
    // dukung pemilihan kolom sederhana ("a, b, c"); "*" = semua kolom
    if (cols && cols.trim() !== '*' && !cols.includes('(')) this.cols = cols.split(',').map((c) => c.trim())
    return this
  }
  insert(values: Row | Row[]) { this.mode = 'insert'; this.payload = values; return this }
  update(values: Row) { this.mode = 'update'; this.payload = values; return this }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = 'upsert'
    this.payload = values
    this.conflict = (opts?.onConflict ?? 'id').split(',').map((s) => s.trim())
    return this
  }
  delete() { this.mode = 'delete'; return this }
  eq(col: string, val: any) { this.filters.push((r) => String(r[col]) === String(val)); return this }
  neq(col: string, val: any) { this.filters.push((r) => String(r[col]) !== String(val)); return this }
  gte(col: string, val: any) { this.filters.push((r) => r[col] >= val); return this }
  lte(col: string, val: any) { this.filters.push((r) => r[col] <= val); return this }
  in(col: string, vals: any[]) { const set = new Set(vals.map(String)); this.filters.push((r) => set.has(String(r[col]))); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy.push({ col, asc: opts?.ascending !== false }); return this }
  limit(n: number) { this.to_ = this.from_ + n - 1; return this }
  range(from: number, to: number) { this.from_ = from; this.to_ = to; return this }
  maybeSingle() { this.single_ = 'maybe'; return this }
  single() { this.single_ = 'one'; return this }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return new Promise<Result>((resolve) => setTimeout(() => resolve(this.run()), 120)).then(ok, fail)
  }

  private rows(): Row[] {
    if (this.table === 'public_surplus') return publicSurplus()
    return (db[this.table] ??= [])
  }

  private validate(row: Row): string | null {
    const me = currentUserId()
    if (!me) return 'JWT expired'
    if (this.table === 'orders') return 'permission denied for table orders'
    if ('user_id' in row && row.user_id !== me) return 'new row violates row-level security policy'
    if ('outlet_id' in row && !['outlets', 'profiles'].includes(this.table) && !myOutletIds().has(row.outlet_id)) return 'new row violates row-level security policy'
    if (this.table === 'daily_records' && Number(row.sold) + Number(row.leftover) > Number(row.produced)) return 'violates check constraint "daily_records_check"'
    if (this.table === 'surplus_listings' && row.is_active && !row.safety_confirmed) return 'violates check constraint "surplus_listings_check1"'
    return null
  }

  private finish(rows: Row[]): Result {
    if (this.cols) {
      const cols = this.cols
      rows = rows.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]])))
    }
    let data: any = rows
    if (this.single_) {
      if (rows.length > 1) return { data: null, error: err('Lebih dari satu baris') }
      if (!rows.length && this.single_ === 'one') return { data: null, error: err('Data tidak ditemukan') }
      data = rows[0] ?? null
    }
    return { data: JSON.parse(JSON.stringify(data)), error: null }
  }

  private run(): Result {
    const visible = () => this.rows().filter((r) => canSee(this.table, r) && this.filters.every((f) => f(r)))

    if (this.mode === 'select') {
      let rows = visible()
      for (const o of [...this.orderBy].reverse()) {
        rows = [...rows].sort((a, b) => (a[o.col] < b[o.col] ? -1 : a[o.col] > b[o.col] ? 1 : 0) * (o.asc ? 1 : -1))
      }
      const count = rows.length
      if (this.headCount) return { data: null, error: null, count }
      rows = rows.slice(this.from_, this.to_ === null ? undefined : this.to_ + 1)
      return { ...this.finish(rows), count }
    }

    if (this.mode === 'delete') {
      const del = new Set(visible())
      db[this.table] = this.rows().filter((r) => !del.has(r))
      persist()
      return { data: this.returning ? [...del] : null, error: null }
    }

    if (this.mode === 'update') {
      const targets = visible()
      for (const t of targets) {
        if (this.table === 'profiles' && 'role' in (this.payload as Row)) return { data: null, error: err('permission denied for table profiles') }
        const e = this.validate({ ...t, ...(this.payload as Row) })
        if (e) return { data: null, error: err(e) }
      }
      for (const t of targets) Object.assign(t, this.payload, 'updated_at' in t ? { updated_at: nowIso() } : {})
      persist()
      return this.returning ? this.finish(targets) : { data: null, error: null }
    }

    // insert / upsert
    const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
    const out: Row[] = []
    for (const values of list) {
      if (this.table === 'profiles') return { data: null, error: err('permission denied for table profiles') }
      const e = this.validate(values)
      if (e) return { data: null, error: err(e) }
      if (this.mode === 'upsert') {
        const keys = this.mode === 'upsert' ? this.conflict : ['id']
        const existing = this.rows().find((r) => keys.every((k) => String(r[k]) === String(values[k])))
        if (existing) {
          Object.assign(existing, values, 'updated_at' in existing ? { updated_at: nowIso() } : {})
          out.push(existing)
          continue
        }
      }
      const row = {
        id: uid(),
        created_at: nowIso(),
        ...(TABLE_DEFAULTS[this.table] ?? {}),
        ...(this.table === 'daily_records' ? { updated_at: nowIso() } : {}),
        ...(['food_logs', 'weight_logs'].includes(this.table) ? { user_id: currentUserId(), log_date: wibToday() } : {}),
        ...values,
      }
      this.rows().push(row)
      out.push(row)
    }
    persist()
    return this.returning ? this.finish(out) : { data: null, error: null }
  }
}

// ---------------- RPC pesanan ----------------
async function rpc(fn: string, args: Row): Promise<Result> {
  await new Promise((r) => setTimeout(r, 150))
  const me = currentUserId()
  const profile = db.profiles.find((p) => p.id === me)
  if (fn === 'place_order') {
    if (!profile || profile.role !== 'customer') return { data: null, error: err('Hanya akun customer yang bisa memesan') }
    const qty = Number(args.p_qty)
    const listing = db.surplus_listings.find((l) => l.id === args.p_listing)
    if (!listing || !listing.is_active || new Date(listing.pickup_until).getTime() <= Date.now()) return { data: null, error: err('Listing sudah tidak tersedia') }
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { data: null, error: err('Jumlah pesanan tidak valid') }
    if (listing.remaining_qty < qty) return { data: null, error: err(`Stok tidak cukup (sisa ${listing.remaining_qty} porsi)`) }
    listing.remaining_qty -= qty
    const order = {
      id: uid(), code: `FP-${uid().replace(/-/g, '').slice(0, 6).toUpperCase()}`, listing_id: listing.id, outlet_id: listing.outlet_id,
      customer_id: me, customer_name: profile.full_name || 'Pelanggan', customer_phone: profile.phone, item_title: listing.title,
      quantity: qty, unit_price: listing.price, total_price: listing.price * qty, status: 'pending', pickup_until: listing.pickup_until,
      note: args.p_note ?? null, created_at: nowIso(), updated_at: nowIso(),
    }
    db.orders.push(order)
    persist()
    return { data: { ...order }, error: null }
  }
  if (fn === 'set_order_status') {
    const order = db.orders.find((o) => o.id === args.p_order)
    if (!order) return { data: null, error: err('Pesanan tidak ditemukan') }
    const isOwner = myOutletIds().has(order.outlet_id)
    const status = String(args.p_status)
    if (order.customer_id === me && !isOwner) {
      if (status !== 'cancelled' || order.status !== 'pending') return { data: null, error: err('Pesanan tidak bisa diubah') }
    } else if (isOwner) {
      if (['picked_up', 'cancelled'].includes(order.status)) return { data: null, error: err('Pesanan sudah selesai') }
    } else {
      return { data: null, error: err('Tidak punya akses') }
    }
    if (status === 'cancelled') {
      const l = db.surplus_listings.find((x) => x.id === order.listing_id)
      if (l) l.remaining_qty = Math.min(l.quantity, l.remaining_qty + order.quantity)
    }
    order.status = status
    order.updated_at = nowIso()
    persist()
    return { data: { ...order }, error: null }
  }
  return { data: null, error: err(`Fungsi ${fn} tidak tersedia di mode demo`) }
}

export const mockSupabase = {
  auth,
  from: (table: string) => new Query(table),
  rpc,
}
