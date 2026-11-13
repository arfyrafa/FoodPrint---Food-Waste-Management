import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, HeartHandshake, MapPin, MessageCircle, Minus, Plus, Salad, Search, Store } from 'lucide-react'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { useAsync } from '../../lib/data'
import { formatTime, rupiah, timeLeft, waLink } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import { BUSINESS_TYPE_LABEL, type Order, type PublicSurplus } from '../../lib/types'

export default function SurplusPublic() {
  const { profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
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

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter((l) => !q || `${l.title} ${l.business_name}`.toLowerCase().includes(q))
  }, [data, query])

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
    const { data: order, error: err } = await supabase.rpc('place_order', { p_listing: ordering.id, p_qty: qty, p_note: note.trim() || null })
    setBusy(false)
    if (err) return setOrderError(friendlyError(err))
    const o = order as Order
    toast(`Pesanan ${o.code} dibuat. Tunjukkan kode saat mengambil.`)
    setOrdering(null)
    reload()
    navigate('/my-orders')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Surplus Food"
        subtitle="Makanan berlebih yang masih layak dari kantin & UMKM sekitar, dengan harga lebih terjangkau."
      />

      {!profile && (
        <Alert tone="info">
          <Link to="/register?role=customer" className="font-semibold underline">Daftar sebagai customer</Link> untuk memesan dan memakai fitur Cek Gizi AI.
        </Alert>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
        <input className="input pl-10" placeholder="Cari makanan atau nama kantin..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari makanan" />
      </div>

      {loading && !data && (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      {data && list.length === 0 && (
        <EmptyState icon={<HeartHandshake className="size-6" />} title={query ? 'Tidak ditemukan' : 'Belum ada makanan surplus saat ini'}>
          {query ? 'Coba kata kunci lain.' : 'Cek lagi nanti, biasanya kantin memasang sisa setelah jam makan siang.'}
        </EmptyState>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((l) => {
          const discount = l.original_price && l.original_price > l.price ? Math.round((1 - l.price / l.original_price) * 100) : null
          const wa = waLink(l.whatsapp, `Halo ${l.business_name}, saya tertarik dengan "${l.title}" di FoodPrint. Masih tersedia?`)
          return (
            <Card key={l.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-stone-900">{l.title}</p>
                  <p className="flex items-center gap-1.5 text-sm text-stone-600"><Store className="size-3.5" /> {l.business_name} · {BUSINESS_TYPE_LABEL[l.business_type]}</p>
                </div>
                {l.price === 0 ? <Badge tone="good">Gratis</Badge> : discount ? <Badge tone="accent">-{discount}%</Badge> : null}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-brand-800">{l.price === 0 ? 'Gratis' : rupiah(l.price)}</span>
                {l.original_price ? <span className="text-sm text-stone-400 line-through">{rupiah(l.original_price)}</span> : null}
                <span className="ml-auto text-sm font-semibold text-stone-700">Sisa {l.remaining_qty} porsi</span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-stone-600">
                <p className="flex items-center gap-1.5"><Clock className="size-3.5 text-accent-500" /> Ambil sebelum {formatTime(l.pickup_until)} ({timeLeft(l.pickup_until)})</p>
                {(l.location_note || l.address) && <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {l.location_note || l.address}</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 pt-1">
                {profile?.role !== 'owner' && (
                  <Button size="sm" variant="accent" onClick={() => openOrder(l)}>{profile ? 'Pesan' : 'Masuk untuk pesan'}</Button>
                )}
                {isCustomer && (
                  <Button size="sm" variant="outline" icon={<Salad className="size-4" />} onClick={() => navigate(`/nutrition?food=${encodeURIComponent(l.title)}`)}>
                    Cek gizi
                  </Button>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    <MessageCircle className="size-4" /> Hubungi
                  </a>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-xs text-stone-400">Listing otomatis hilang setelah batas waktu ambil. Penjual wajib mengonfirmasi checklist keamanan pangan.</p>

      <Modal open={Boolean(ordering)} onClose={() => setOrdering(null)} title="Pesan makanan surplus">
        {ordering && (
          <div className="space-y-4">
            {!isCustomer ? (
              <Alert tone="warn">Hanya akun customer yang bisa memesan.</Alert>
            ) : (
              <>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="font-bold text-stone-900">{ordering.title}</p>
                  <p className="text-sm text-stone-600">{ordering.business_name} · ambil sebelum {formatTime(ordering.pickup_until)}</p>
                </div>
                {orderError && <Alert tone="danger">{orderError}</Alert>}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-700">Jumlah porsi</span>
                  <div className="flex items-center gap-3">
                    <button className="grid size-10 place-items-center rounded-xl border border-stone-300 disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} aria-label="Kurangi"><Minus className="size-4" /></button>
                    <span className="w-6 text-center text-lg font-bold">{qty}</span>
                    <button className="grid size-10 place-items-center rounded-xl border border-stone-300 disabled:opacity-40" disabled={qty >= Math.min(ordering.remaining_qty, 20)} onClick={() => setQty((q) => q + 1)} aria-label="Tambah"><Plus className="size-4" /></button>
                  </div>
                </div>
                <Field label="Catatan untuk penjual (opsional)" htmlFor="onote">
                  <input id="onote" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: ambil jam 3 sore" />
                </Field>
                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  <span className="text-stone-600">Total bayar di tempat</span>
                  <span className="text-xl font-extrabold text-brand-800">{ordering.price === 0 ? 'Gratis' : rupiah(ordering.price * qty)}</span>
                </div>
                <Button className="w-full" size="lg" variant="accent" loading={busy} onClick={placeOrder}>Pesan sekarang</Button>
                <p className="text-center text-xs text-stone-500">Pembayaran dilakukan langsung ke penjual saat pengambilan.</p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
