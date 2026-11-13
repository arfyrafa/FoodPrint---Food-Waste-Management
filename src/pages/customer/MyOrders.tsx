import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { OrderStatusBadge } from '../../components/OrderBits'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, EmptyState, PageHeader, PageSkeleton } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { useAsync } from '../../lib/data'
import { formatDateTime, rupiah } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { Order } from '../../lib/types'

export default function MyOrders() {
  const { session } = useAuth()
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)
  const userId = session?.user.id
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.from('orders').select('*').eq('customer_id', userId!).order('created_at', { ascending: false }).limit(50)
    if (err) throw new Error(friendlyError(err))
    return (rows ?? []) as Order[]
  }, [userId])

  async function cancel(o: Order) {
    setBusyId(o.id)
    const { error: err } = await supabase.rpc('set_order_status', { p_order: o.id, p_status: 'cancelled' })
    setBusyId(null)
    if (err) return toast(friendlyError(err), 'error')
    toast('Pesanan dibatalkan.')
    reload()
  }

  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>

  return (
    <div className="space-y-5">
      <PageHeader title="Pesananku" subtitle="Tunjukkan kode pesanan saat mengambil makanan." />
      {data?.length === 0 && (
        <EmptyState icon={<Receipt className="size-6" />} title="Belum ada pesanan" action={<Link to="/surplus" className="font-semibold text-brand-700 underline">Lihat makanan surplus</Link>}>
          Pesan makanan surplus dengan harga terjangkau dari kantin sekitar.
        </EmptyState>
      )}
      <div className="space-y-3">
        {data?.map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-stone-900">{o.quantity}× {o.item_title}</p>
                <p className="text-sm text-stone-600">{o.total_price === 0 ? 'Gratis' : `${rupiah(o.total_price)} · bayar di tempat`}</p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            {['pending', 'confirmed'].includes(o.status) && (
              <div className="mt-3 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 py-3 text-center">
                <p className="text-xs font-semibold text-brand-700">Kode pengambilan</p>
                <p className="font-mono text-2xl font-extrabold tracking-widest text-brand-900">{o.code}</p>
                <p className="text-xs text-stone-600">Ambil sebelum {formatDateTime(o.pickup_until)}</p>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-stone-500">Dipesan {formatDateTime(o.created_at)}</p>
              {o.status === 'pending' && (
                <Button size="sm" variant="outline" loading={busyId === o.id} onClick={() => cancel(o)}>Batalkan</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
