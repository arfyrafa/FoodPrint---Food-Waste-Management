import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Clock,
  HandPlatter,
  HeartHandshake,
  Info,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Salad,
  Search,
  Store,
} from 'lucide-react'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton, cn } from '../../components/ui'
import { menuColor } from '../../components/MenuAvatar'
import { useAuth } from '../../contexts/AuthContext'
import { BackLink } from '../../components/Layouts'
import { useAsync } from '../../lib/data'
import { formatTime, isEndingSoon, rupiah, timeLeft, toTitleCase, waLink } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import { BUSINESS_TYPE_LABEL, type Order, type PublicSurplus } from '../../lib/types'

type FilterType = 'all' | 'free' | 'paid' | 'ending_soon'
type SortBy = 'soonest' | 'price_asc' | 'qty_desc' | 'discount_desc'

export default function SurplusPublic() {
  const { profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  
  // State pencarian, filter, dan sort
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedCanteen, setSelectedCanteen] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('soonest')

  // State pemesanan
  const [ordering, setOrdering] = useState<PublicSurplus | null>(null)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [orderError, setOrderError] = useState('')

  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.from('public_surplus').select('*').order('pickup_until')
    if (err) throw new Error(friendlyError(err))
    return (rows ?? []) as PublicSurplus[]
  }, [])

  // Daftar kantin unik untuk dropdown filter
  const canteenList = useMemo(() => {
    const set = new Set<string>()
    data?.forEach((l) => {
      if (l.business_name) set.add(l.business_name)
    })
    return Array.from(set).sort()
  }, [data])

  // Hasil filter dan sort terpadu
  const list = useMemo(() => {
    let res = (data ?? []).slice()
    const q = query.trim().toLowerCase()

    if (q) {
      res = res.filter((l) =>
        `${l.title} ${l.business_name} ${l.location_note ?? ''} ${l.address ?? ''}`
          .toLowerCase()
          .includes(q),
      )
    }

    if (filterType === 'free') {
      res = res.filter((l) => l.price === 0)
    } else if (filterType === 'paid') {
      res = res.filter((l) => l.price > 0)
    } else if (filterType === 'ending_soon') {
      res = res.filter((l) => isEndingSoon(l.pickup_until))
    }

    if (selectedCanteen !== 'all') {
      res = res.filter((l) => l.business_name === selectedCanteen)
    }

    if (sortBy === 'price_asc') {
      res.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'qty_desc') {
      res.sort((a, b) => b.remaining_qty - a.remaining_qty)
    } else if (sortBy === 'discount_desc') {
      res.sort((a, b) => {
        const discA = a.original_price && a.original_price > a.price ? 1 - a.price / a.original_price : 0
        const discB = b.original_price && b.original_price > b.price ? 1 - b.price / b.original_price : 0
        return discB - discA
      })
    } else {
      // Default: waktu ambil terdekat
      res.sort((a, b) => new Date(a.pickup_until).getTime() - new Date(b.pickup_until).getTime())
    }

    return res
  }, [data, query, filterType, selectedCanteen, sortBy])

  const isCustomer = profile?.role === 'customer'

  function openOrder(l: PublicSurplus) {
    if (!profile) return navigate('/login', { state: { from: '/surplus' } })
    setOrdering(l)
    setQty(1)
    setNote('')
    setOrderError('')
  }

  async function placeOrder() {
    if (!ordering) return
    setBusy(true)
    setOrderError('')
    const { data: order, error: err } = await supabase.rpc('place_order', {
      p_listing: ordering.id,
      p_qty: qty,
      p_note: note.trim() || null,
    })
    setBusy(false)
    if (err) return setOrderError(friendlyError(err))
    const o = order as Order
    toast(`Pesanan ${o.code} berhasil dibuat. Tunjukkan barcode saat mengambil.`)
    setOrdering(null)
    reload()
    navigate('/my-orders')
  }

  return (
    <div className="space-y-6">
      {!profile && (
        <div className="-mb-2 -ml-2.5">
          <BackLink />
        </div>
      )}

      <PageHeader
        title="Makanan Surplus Kantin"
        subtitle="Penyelamatan porsi makanan layak makan berkualitas dari kantin kampus dengan harga bersahabat."
      />

      {!profile && (
        <Alert tone="info">
          <Link to="/register?role=customer" className="font-semibold underline">
            Daftar sebagai mahasiswa / pembeli
          </Link>{' '}
          untuk memesan makanan surplus dan menggunakan fitur Cek Gizi AI.
        </Alert>
      )}

      {/* FILTER & PENCARIAN TERPADU */}
      <div className="space-y-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-xs sm:p-4">
        {/* Baris 1: Search Input dengan Kontras Kuat */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-500" />
          <input
            className="input pl-10 h-11 placeholder:text-stone-600 text-stone-900 border-stone-300 focus:border-brand-600 focus:ring-brand-600/20"
            placeholder="Cari makanan atau nama kantin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari makanan"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-stone-400 hover:text-stone-700"
            >
              Reset
            </button>
          )}
        </div>

        {/* Baris 2: Filter Chips & Dropdown Sort/Kantin */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Chip Kategori */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition',
                filterType === 'all'
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80',
              )}
            >
              Semua ({data?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('free')}
              className={cn(
                'inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition',
                filterType === 'free'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80',
              )}
            >
              Gratis
            </button>
            <button
              type="button"
              onClick={() => setFilterType('paid')}
              className={cn(
                'inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition',
                filterType === 'paid'
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80',
              )}
            >
              Berbayar
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ending_soon')}
              className={cn(
                'inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition',
                filterType === 'ending_soon'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70',
              )}
            >
              <Clock className="size-3" />
              Segera Berakhir
            </button>
          </div>

          {/* Dropdown Kantin & Urutan */}
          <div className="flex flex-wrap items-center gap-2">
            {canteenList.length > 1 && (
              <select
                value={selectedCanteen}
                onChange={(e) => setSelectedCanteen(e.target.value)}
                className="h-8 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 hover:border-stone-300 focus:outline-hidden"
                aria-label="Pilih Kantin"
              >
                <option value="all">Semua Kantin</option>
                {canteenList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-8 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 hover:border-stone-300 focus:outline-hidden"
              aria-label="Urutkan"
            >
              <option value="soonest">Waktu Terdekat</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="discount_desc">Diskon Terbesar</option>
              <option value="qty_desc">Porsi Terbanyak</option>
            </select>
          </div>

        </div>
      </div>

      {loading && !data && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {data && list.length === 0 && (
        <EmptyState
          icon={<HeartHandshake className="size-6" />}
          title={query || filterType !== 'all' || selectedCanteen !== 'all' ? 'Makanan tidak ditemukan' : 'Belum ada makanan surplus saat ini'}
        >
          {query || filterType !== 'all' || selectedCanteen !== 'all' ? (
            <div className="space-y-2">
              <p>Tidak ada makanan surplus yang cocok dengan filter yang dipilih.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setFilterType('all')
                  setSelectedCanteen('all')
                }}
              >
                Reset Semua Filter
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p>Biasanya kantin kampus memasang makanan surplus setelah jam makan siang (pk 14:00) hingga sore hari.</p>
              {profile?.role === 'owner' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/surplus/manage')}>
                  + Pasang Makanan Surplus
                </Button>
              )}
            </div>
          )}
        </EmptyState>
      )}

      {/* GRID MAKANAN SURPLUS (3 KOLOM DI DESKTOP) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((l) => {
          const discount =
            l.original_price && l.original_price > l.price
              ? Math.round((1 - l.price / l.original_price) * 100)
              : null
          const endingSoon = isEndingSoon(l.pickup_until)
          const wa = waLink(
            l.whatsapp,
            `Halo ${l.business_name}, saya tertarik dengan makanan surplus "${l.title}" di FoodPrint. Apakah porsinya masih tersedia?`,
          )

          return (
            <Card key={l.id} className="group flex flex-col overflow-hidden border border-stone-200/90 transition hover:border-stone-300 hover:shadow-md">
              
              {/* AREA FOTO DENGAN TINGGI TERKENDALI (H-48 / ASPECT 16:9) */}
              <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                {l.photo_url ? (
                  <img
                    src={l.photo_url}
                    alt={l.title}
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className={cn('flex size-full flex-col items-center justify-center gap-1.5 p-4 text-center', menuColor(l.title))}>
                    <div className="grid size-12 place-items-center rounded-2xl bg-white/90 shadow-2xs text-stone-700">
                      <HandPlatter className="size-6 text-brand-700" />
                    </div>
                    <span className="text-xs font-semibold text-stone-700">Porsi Siap Santap</span>
                  </div>
                )}

                {/* Badge Status di Sudut Kiri Atas Foto */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {endingSoon ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600/95 px-2.5 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-xs animate-pulse">
                      <Clock className="size-3" /> Segera Berakhir
                    </span>
                  ) : discount ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-accent-600/95 px-2.5 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-xs">
                      Hemat -{discount}%
                    </span>
                  ) : l.price === 0 ? (
                    <span className="inline-flex items-center rounded-lg bg-emerald-700/95 px-2.5 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-xs">
                      Porsi Donasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-lg bg-brand-800/80 px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs">
                      Penyelamatan Pangan
                    </span>
                  )}
                </div>

                {/* Badge Sisa Porsi di Sudut Kanan Atas Foto */}
                <div className="absolute top-3 right-3">
                  {l.remaining_qty <= 2 ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-xs border border-rose-200 backdrop-blur-xs">
                      <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" /> Sisa {l.remaining_qty} porsi
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-xs border border-stone-200/80 backdrop-blur-xs">
                      Sisa {l.remaining_qty} porsi
                    </span>
                  )}
                </div>
              </div>

              {/* KONTEN DETAIL CARD */}
              <div className="flex flex-1 flex-col p-4">
                
                {/* Header Judul & Nama Kantin */}
                <div>
                  <h3 className="text-base font-extrabold text-stone-900 line-clamp-1" title={l.title}>
                    {l.title.trim().toLowerCase() === 'bubur' ? 'Bubur Ayam' : toTitleCase(l.title)}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                    <Store className="size-3.5 shrink-0 text-stone-400" />
                    <span className="truncate">
                      {l.business_name.toLowerCase().includes(BUSINESS_TYPE_LABEL[l.business_type].toLowerCase())
                        ? l.business_name
                        : `${l.business_name} · ${BUSINESS_TYPE_LABEL[l.business_type]}`}
                    </span>
                  </p>
                </div>

                {/* Harga dengan Konteks Penyelamatan Surplus */}
                <div className="mt-3 flex items-baseline gap-2 border-y border-stone-100 py-2.5">
                  <span className={cn('text-xl font-black tracking-tight', l.price === 0 ? 'text-emerald-700' : 'text-brand-900')}>
                    {l.price === 0 ? 'Gratis' : rupiah(l.price)}
                  </span>
                  
                  {l.original_price && l.original_price > l.price ? (
                    <span className="text-xs text-stone-400 line-through">
                      {rupiah(l.original_price)}
                    </span>
                  ) : null}

                  {discount ? (
                    <span className="ml-auto rounded-md bg-accent-50 px-1.5 py-0.5 text-xs font-extrabold text-accent-700 border border-accent-200">
                      Diskon {discount}%
                    </span>
                  ) : (
                    <span className="ml-auto text-[11px] font-medium text-stone-500">
                      Harga Penyelamatan
                    </span>
                  )}
                </div>

                {/* Sisa Waktu, Lokasi Fisik, dan Catatan Tambahan */}
                <div className="mt-2.5 space-y-2 text-xs text-stone-600 flex-1">
                  
                  {/* Baris Waktu */}
                  <p className={cn('flex items-center gap-1.5 font-medium', endingSoon ? 'text-rose-700 font-semibold' : 'text-stone-600')}>
                    <Clock className={cn('size-3.5 shrink-0', endingSoon ? 'text-rose-600' : 'text-accent-600')} />
                    <span>Ambil s/d {formatTime(l.pickup_until)}</span>
                    <span className={cn('font-normal', endingSoon ? 'font-bold' : 'text-stone-500')}>
                      ({timeLeft(l.pickup_until)})
                    </span>
                  </p>

                  {/* Baris Lokasi Fisik Pengambilan */}
                  {l.address && (
                    <p className="flex items-start gap-1.5 text-stone-600">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
                      <span className="line-clamp-1">{l.address}</span>
                    </p>
                  )}

                  {/* Baris Catatan Khusus Penjual (Bukan Ikon Lokasi) */}
                  {l.location_note && (
                    <div className="flex items-start gap-1.5 rounded-lg bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-600 border border-stone-150">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-brand-700" />
                      <span>{l.location_note}</span>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi dengan Hirarki Jelas */}
                <div className="mt-4 flex items-center gap-2 pt-2 border-t border-stone-100">
                  {profile?.role !== 'owner' ? (
                    <Button
                      size="sm"
                      variant="accent"
                      className="flex-1 font-bold shadow-xs hover:bg-accent-700 active:scale-[0.98]"
                      onClick={() => openOrder(l)}
                    >
                      {profile ? 'Pesan' : 'Masuk untuk Pesan'}
                    </Button>
                  ) : (
                    <Link
                      to="/surplus/manage"
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Kelola di Dashboard
                    </Link>
                  )}

                  {isCustomer && (
                    <button
                      type="button"
                      onClick={() => navigate(`/nutrition?food=${encodeURIComponent(l.title)}`)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                      title="Periksa kalori dan gizi makanan ini"
                    >
                      <Salad className="size-3.5 text-brand-600" />
                      <span>Cek Gizi</span>
                    </button>
                  )}

                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      title="Hubungi kantin via WhatsApp"
                      aria-label="Hubungi kantin via WhatsApp"
                    >
                      <MessageCircle className="size-4 text-emerald-600" />
                    </a>
                  )}
                </div>

              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-xs text-stone-400">
        Listing makanan surplus otomatis hilang setelah batas waktu pengambilan berakhir. Seluruh makanan wajib lolos verifikasi standar kelayakan pangan.
      </p>

      {/* MODAL PESAN */}
      <Modal open={Boolean(ordering)} onClose={() => setOrdering(null)} title="Pesan Makanan Surplus">
        {ordering && (
          <div className="space-y-4">
            {!isCustomer ? (
              <Alert tone="warn">Hanya akun mahasiswa/customer yang bisa memesan makanan surplus.</Alert>
            ) : (
              <>
                <div className="rounded-xl bg-stone-50 p-3 border border-stone-200/70">
                  <p className="font-bold text-stone-900">
                    {ordering.title.trim().toLowerCase() === 'bubur' ? 'Bubur Ayam' : toTitleCase(ordering.title)}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {ordering.business_name} · Ambil sebelum {formatTime(ordering.pickup_until)} ({timeLeft(ordering.pickup_until)})
                  </p>
                  {ordering.address && (
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                      <MapPin className="size-3 text-stone-400" /> {ordering.address}
                    </p>
                  )}
                </div>

                {orderError && <Alert tone="danger">{orderError}</Alert>}

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-700">Jumlah porsi</span>
                  <div className="flex items-center gap-3">
                    <button
                      className="grid size-10 place-items-center rounded-xl border border-stone-300 disabled:opacity-40"
                      disabled={qty <= 1}
                      onClick={() => setQty((q) => q - 1)}
                      aria-label="Kurangi"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center text-lg font-bold">{qty}</span>
                    <button
                      className="grid size-10 place-items-center rounded-xl border border-stone-300 disabled:opacity-40"
                      disabled={qty >= Math.min(ordering.remaining_qty, 20)}
                      onClick={() => setQty((q) => q + 1)}
                      aria-label="Tambah"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <Field label="Catatan untuk penjual (opsional)" htmlFor="onote">
                  <input
                    id="onote"
                    className="input"
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: ambil jam 2 siang, jangan terlalu pedas"
                  />
                </Field>

                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  <span className="text-sm text-stone-600">Total bayar di tempat</span>
                  <span className="text-xl font-extrabold text-brand-900">
                    {ordering.price === 0 ? 'Gratis' : rupiah(ordering.price * qty)}
                  </span>
                </div>

                <Button className="w-full" size="lg" variant="accent" loading={busy} onClick={placeOrder}>
                  Pesan Sekarang
                </Button>
                <p className="text-center text-xs text-stone-500">
                  Pembayaran dilakukan langsung ke kasir kantin saat pengambilan pesanan.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
