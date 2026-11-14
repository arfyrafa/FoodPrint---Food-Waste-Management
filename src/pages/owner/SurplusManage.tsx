import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Clock, EyeOff, PackageOpen, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { MenuAvatar } from '../../components/MenuAvatar'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, PageSkeleton } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { useAsync } from '../../lib/data'
import { formatDateTime, rupiah, timeLeft } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { SurplusListing } from '../../lib/types'

export default function SurplusManage() {
  const outlet = useOutlet()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.from('surplus_listings').select('*').eq('outlet_id', outlet.id).order('created_at', { ascending: false }).limit(50)
    if (err) throw new Error(friendlyError(err))
    return (rows ?? []) as SurplusListing[]
  }, [outlet.id])

  const [toDelete, setToDelete] = useState<SurplusListing | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function remove() {
    if (!toDelete) return
    setDeleting(true)
    const { error: err } = await supabase.from('surplus_listings').delete().eq('id', toDelete.id)
    setDeleting(false)
    if (err) return toast(friendlyError(err), 'error')
    toast(`"${toDelete.title}" dihapus.`)
    setToDelete(null)
    reload()
  }

  async function deactivate(l: SurplusListing) {
    const { error: err } = await supabase.from('surplus_listings').update({ is_active: false }).eq('id', l.id)
    if (err) return toast(friendlyError(err), 'error')
    toast('Listing disembunyikan dari halaman publik.')
    reload()
  }

  async function reactivate(l: SurplusListing) {
    if (new Date(l.pickup_until).getTime() <= Date.now()) return toast('Batas waktu ambil sudah lewat. Buat listing baru.', 'error')
    const { error: err } = await supabase.from('surplus_listings').update({ is_active: true }).eq('id', l.id)
    if (err) return toast(friendlyError(err), 'error')
    toast('Listing aktif kembali.')
    reload()
  }

  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>

  const now = Date.now()
  const status = (l: SurplusListing) => {
    if (!l.is_active) return <Badge>Disembunyikan</Badge>
    if (new Date(l.pickup_until).getTime() <= now) return <Badge tone="danger">Kedaluwarsa</Badge>
    if (l.remaining_qty === 0) return <Badge tone="info">Habis dipesan</Badge>
    return <Badge tone="good">Tayang</Badge>
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Surplus Food"
        subtitle="Jual sisa makanan yang masih layak dengan harga miring. Customer memesan, lalu mengambil di tempat."
        action={<Link to="/surplus/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-4 font-semibold text-white hover:bg-accent-600"><Plus className="size-4" /> Buat listing</Link>}
      />
      {!outlet.whatsapp && (
        <Alert tone="warn" title="Nomor WhatsApp belum diisi">
          Tambahkan nomor WhatsApp & alamat di <Link to="/settings" className="font-semibold underline">Pengaturan</Link> agar customer bisa menghubungi kamu.
        </Alert>
      )}
      {data?.length === 0 && (
        <EmptyState icon={<PackageOpen className="size-6" />} title="Belum ada listing" action={<Link to="/surplus/new" className="font-semibold text-brand-700 underline">Buat listing pertama</Link>}>
          Punya sisa makanan yang masih layak? Pasang di sini agar tidak terbuang.
        </EmptyState>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-start gap-3">
              {l.photo_url ? (
                <img src={l.photo_url} alt={l.title} className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
              ) : (
                <MenuAvatar name={l.title} className="size-16" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-stone-900">{l.title}</p>
                  {status(l)}
                </div>
            <p className="mt-1 text-sm text-stone-600">
              {l.price === 0 ? <b className="text-brand-700">Gratis</b> : <b>{rupiah(l.price)}</b>}
              {l.original_price ? <span className="ml-1 text-stone-400 line-through">{rupiah(l.original_price)}</span> : null}
              {' · '}sisa {l.remaining_qty}/{l.quantity} porsi
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
              <Clock className="size-3.5" /> Ambil sebelum {formatDateTime(l.pickup_until)} ({timeLeft(l.pickup_until)})
            </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.is_active ? (
                <Button size="sm" variant="outline" icon={<EyeOff className="size-4" />} onClick={() => deactivate(l)}>Sembunyikan</Button>
              ) : (
                <Button size="sm" variant="outline" icon={<RotateCcw className="size-4" />} onClick={() => reactivate(l)}>Tayangkan lagi</Button>
              )}
              <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={() => setToDelete(l)}>
                Hapus
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Hapus listing?">
        {toDelete && (
          <div className="space-y-4">
            <p className="text-stone-700">
              Listing <b>{toDelete.title}</b> akan dihapus permanen dan hilang dari halaman Surplus Food. Pesanan yang sudah masuk tetap tersimpan di halaman Pesanan.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setToDelete(null)}>Batal</Button>
              <Button variant="danger" loading={deleting} icon={<Trash2 className="size-4" />} onClick={remove}>Hapus</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
