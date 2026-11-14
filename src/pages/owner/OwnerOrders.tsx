import { useState } from 'react'
import { MessageCircle, Receipt, ScanBarcode } from 'lucide-react'
import { OrderStatusBadge } from '../../components/OrderBits'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, EmptyState, PageHeader, PageSkeleton, Segmented } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { useAsync } from '../../lib/data'
import { formatDateTime, rupiah, waLink } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { Order, OrderStatus } from '../../lib/types'

export default function OwnerOrders() {
  const outlet = useOutlet()
  const toast = useToast()
  const [filter, setFilter] = useState<'active' | 'done'>('active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [scan, setScan] = useState('')
  const [foundId, setFoundId] = useState<string | null>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.from('orders').select('*').eq('outlet_id', outlet.id).order('created_at', { ascending: false }).limit(100)
    if (err) throw new Error(friendlyError(err))
    return (rows ?? []) as Order[]
  }, [outlet.id])

  async function setStatus(o: Order, status: OrderStatus) {
    setBusyId(o.id)
    const { error: err } = await supabase.rpc('set_order_status', { p_order: o.id, p_status: status })
    setBusyId(null)
    if (err) return toast(friendlyError(err), 'error')
    toast(status === 'confirmed' ? 'Pesanan dikonfirmasi.' : status === 'picked_up' ? 'Pesanan selesai.' : 'Pesanan dibatalkan, stok dikembalikan.')
    reload()
  }

  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>

  const list = (data ?? []).filter((o) => (filter === 'active' ? ['pending', 'confirmed'].includes(o.status) : ['picked_up', 'cancelled'].includes(o.status)))
  const found = foundId ? (data ?? []).find((o) => o.id === foundId) ?? null : null

  function lookup(e: React.FormEvent) {
    e.preventDefault()
    const code = scan.trim().toUpperCase()
    if (!code) return
    const order = (data ?? []).find((o) => o.code.toUpperCase() === code)
    setScan('')
    if (!order) {
      setFoundId(null)
      return toast(`Pesanan ${code} tidak ditemukan.`, 'error')
    }
    setFoundId(order.id)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pesanan masuk"
        subtitle="Pesanan makanan surplus dari customer. Pembayaran dilakukan saat pengambilan."
        action={<Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Aktif' }, { value: 'done', label: 'Selesai' }]} />}
      />
      <Card className="p-4">
        <form onSubmit={lookup} className="flex flex-wrap items-center gap-2">
          <label htmlFor="scan" className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <ScanBarcode className="size-5 text-brand-700" /> Scan / ketik kode pesanan
          </label>
          <input
            id="scan"
            className="input min-w-0 flex-1 font-mono uppercase"
            placeholder="FP-XXXXXX"
            autoComplete="off"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
          />
          <Button type="submit">Cari</Button>
        </form>
        <p className="mt-2 text-xs text-stone-500">Scanner barcode USB/Bluetooth bisa langsung dipakai: arahkan ke barcode di HP customer, kode terisi dan dicari otomatis.</p>
        {found && (
          <div className="fade-in mt-3 rounded-xl border-2 border-brand-300 bg-brand-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-bold text-brand-800">{found.code}</p>
                <p className="font-bold text-stone-900">{found.quantity}× {found.item_title}</p>
                <p className="text-sm text-stone-600">{found.customer_name} · {found.total_price === 0 ? 'Gratis' : rupiah(found.total_price)}</p>
              </div>
              <OrderStatusBadge status={found.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['pending', 'confirmed'].includes(found.status) ? (
                <Button size="sm" loading={busyId === found.id} onClick={() => setStatus(found, 'picked_up')}>Tandai sudah diambil</Button>
              ) : (
                <p className="text-sm text-stone-600">Pesanan ini sudah {found.status === 'picked_up' ? 'diambil' : 'dibatalkan'}.</p>
              )}
              <Button size="sm" variant="ghost" onClick={() => setFoundId(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </Card>

      {list.length === 0 && <EmptyState icon={<Receipt className="size-6" />} title={filter === 'active' ? 'Belum ada pesanan aktif' : 'Belum ada riwayat'}>Pesanan dari customer akan muncul di sini.</EmptyState>}
      <div className="space-y-3">
        {list.map((o) => {
          const wa = waLink(o.customer_phone, `Halo ${o.customer_name}, pesanan ${o.code} (${o.item_title}) di ${outlet.business_name} sudah siap diambil.`)
          return (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-brand-800">{o.code}</p>
                  <p className="font-bold text-stone-900">{o.quantity}× {o.item_title}</p>
                  <p className="text-sm text-stone-600">{o.customer_name} · {o.total_price === 0 ? 'Gratis' : rupiah(o.total_price)}</p>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              {o.note && <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">Catatan: {o.note}</p>}
              <p className="mt-2 text-xs text-stone-500">Dipesan {formatDateTime(o.created_at)} · ambil sebelum {formatDateTime(o.pickup_until)}</p>
              {['pending', 'confirmed'].includes(o.status) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === 'pending' && <Button size="sm" loading={busyId === o.id} onClick={() => setStatus(o, 'confirmed')}>Konfirmasi</Button>}
                  {o.status === 'confirmed' && <Button size="sm" loading={busyId === o.id} onClick={() => setStatus(o, 'picked_up')}>Sudah diambil</Button>}
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => setStatus(o, 'cancelled')}>Batalkan</Button>
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                      <MessageCircle className="size-4" /> WhatsApp
                    </a>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
