import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { PhotoField } from '../../components/PhotoField'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, Field, PageHeader } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { fetchMenus, useAsync } from '../../lib/data'
import { rupiah } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'

const CHECKLIST = [
  'Makanan disimpan dalam kondisi layak (tertutup, tidak basi, tidak berbau)',
  'Belum melewati batas waktu aman konsumsi (maks. ±4 jam di suhu ruang)',
  'Kemasan/wadah bersih dan tertutup',
]

// Moderasi sederhana pada catatan listing (aturan lomba: tanpa SARA/pornografi/judi)
const BLOCKED = /\b(judi|slot|togel|porno|bokep|casino)\b/i

function defaultPickup() {
  const d = new Date(Date.now() + 3 * 3600_000)
  d.setMinutes(0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SurplusNew() {
  const outlet = useOutlet()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: menus } = useAsync(() => fetchMenus(outlet.id), [outlet.id])
  const [menuId, setMenuId] = useState('')
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('5')
  const [price, setPrice] = useState('0')
  const [pickup, setPickup] = useState(defaultPickup())
  const [note, setNote] = useState(outlet.address ?? '')
  const [photo, setPhoto] = useState<string | null>(null)
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const menu = useMemo(() => menus?.find((m) => m.id === menuId) ?? null, [menus, menuId])
  const allChecked = checks.every(Boolean)

  function pickMenu(id: string) {
    setMenuId(id)
    const m = menus?.find((x) => x.id === id)
    if (m) {
      setTitle(m.name)
      setPrice(String(Math.round((m.price * 0.5) / 500) * 500))
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const qty = Number(quantity)
    const priceNum = Number(price)
    const until = new Date(pickup)
    if (!title.trim()) return setError('Nama makanan wajib diisi.')
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) return setError('Jumlah porsi 1-500.')
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError('Harga tidak valid.')
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now() + 10 * 60_000) return setError('Batas waktu ambil minimal 10 menit dari sekarang.')
    if (until.getTime() > Date.now() + 24 * 3600_000) return setError('Batas waktu ambil maksimal 24 jam ke depan demi keamanan pangan.')
    if (BLOCKED.test(`${title} ${note}`)) return setError('Teks mengandung kata yang tidak diperbolehkan.')
    if (!photo) return setError('Foto makanan sisa hari ini wajib diisi agar customer bisa melihat kondisinya.')
    if (!allChecked) return setError('Centang semua checklist keamanan pangan sebelum menayangkan.')

    setBusy(true)
    const { error: err } = await supabase.from('surplus_listings').insert({
      outlet_id: outlet.id,
      menu_id: menuId || null,
      title: title.trim(),
      quantity: qty,
      remaining_qty: qty,
      price: Math.round(priceNum),
      original_price: menu?.price ?? null,
      pickup_until: until.toISOString(),
      location_note: note.trim() || null,
      safety_confirmed: true,
      is_active: true,
      photo_url: photo,
    })
    setBusy(false)
    if (err) return setError(friendlyError(err))
    toast('Listing surplus tayang di halaman publik.')
    navigate('/surplus/manage')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Buat listing surplus" subtitle="Listing otomatis tersembunyi setelah batas waktu ambil lewat atau stok habis." />
      <Card className="p-4 sm:p-6">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <PhotoField
            label="Foto makanan sisa hari ini"
            emptyText="Foto makanan yang mau dijual"
            hint="Foto kondisi asli makanan saat ini, bukan foto menu. Customer melihat foto ini sebelum memesan."
            value={photo}
            onChange={setPhoto}
            onError={setError}
          />
          <Field label="Dari menu (opsional)" htmlFor="smenu">
            <select id="smenu" className="input" value={menuId} onChange={(e) => pickMenu(e.target.value)}>
              <option value="">Pilih menu...</option>
              {menus?.map((m) => <option key={m.id} value={m.id}>{m.name} ({rupiah(m.price)})</option>)}
            </select>
          </Field>
          <Field label="Nama makanan" htmlFor="stitle">
            <input id="stitle" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Nasi ayam (sisa siang)" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumlah porsi" htmlFor="sqty">
              <input id="sqty" className="input" inputMode="numeric" value={quantity} onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setQuantity(e.target.value)} />
            </Field>
            <Field label="Harga / porsi (Rp)" htmlFor="sprice" hint={menu ? `Harga normal ${rupiah(menu.price)}. Isi 0 = gratis` : 'Isi 0 = gratis'}>
              <input id="sprice" className="input" inputMode="numeric" value={price} onChange={(e) => /^\d{0,7}$/.test(e.target.value) && setPrice(e.target.value)} />
            </Field>
          </div>
          <Field label="Batas waktu ambil" htmlFor="spick">
            <input id="spick" type="datetime-local" className="input" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </Field>
          <Field label="Lokasi / catatan pengambilan" htmlFor="snote">
            <textarea id="snote" className="input min-h-20" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Ambil di kasir, bawa wadah sendiri" />
          </Field>

          <fieldset className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-bold text-brand-900"><ShieldCheck className="size-4" /> Checklist keamanan pangan (wajib)</legend>
            <div className="mt-1 space-y-2.5">
              {CHECKLIST.map((c, i) => (
                <label key={c} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={checks[i]} onChange={(e) => setChecks((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))} />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" className="w-full" size="lg" variant="accent" loading={busy} disabled={!allChecked}>Tayangkan listing</Button>
        </form>
      </Card>
    </div>
  )
}
