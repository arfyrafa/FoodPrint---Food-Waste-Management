import { useEffect, useMemo, useState } from 'react'
import { Archive, ArchiveRestore, Camera, ChevronLeft, ChevronRight, Pencil, Plus, Save, UtensilsCrossed } from 'lucide-react'
import { VisionCapture, type EditableItem } from '../../components/VisionCapture'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, PageSkeleton, Segmented, cn } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { fetchMenus, useAsync } from '../../lib/data'
import { addDays, formatDateLong, rupiah, todayISO } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { DailyRecord, Menu } from '../../lib/types'

export default function InputPage() {
  const [tab, setTab] = useState<'daily' | 'menu'>('daily')
  return (
    <div>
      <PageHeader
        title="Catatan & Menu"
        subtitle="Catat produksi, terjual, dan sisa setiap hari. Atur harga jual dan HPP di tab Menu."
        action={<Segmented value={tab} onChange={setTab} options={[{ value: 'daily', label: 'Catatan harian' }, { value: 'menu', label: 'Menu' }]} />}
      />
      {tab === 'daily' ? <DailyForm onGoToMenu={() => setTab('menu')} /> : <MenuManager />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Catatan harian
// ---------------------------------------------------------------------------
type Row = { produced: string; sold: string; leftover: string }
const emptyRow: Row = { produced: '', sold: '', leftover: '' }

function DailyForm({ onGoToMenu }: { onGoToMenu: () => void }) {
  const outlet = useOutlet()
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photoFor, setPhotoFor] = useState<Menu | null>(null)
  const [photoItems, setPhotoItems] = useState<EditableItem[]>([])

  const { data, loading, error } = useAsync(async () => {
    const [menus, recs] = await Promise.all([
      fetchMenus(outlet.id),
      supabase.from('daily_records').select('*').eq('outlet_id', outlet.id).eq('record_date', date),
    ])
    if (recs.error) throw new Error(friendlyError(recs.error))
    return { menus, records: (recs.data ?? []) as DailyRecord[] }
  }, [outlet.id, date])

  useEffect(() => {
    if (!data) return
    const next: Record<string, Row> = {}
    for (const m of data.menus) {
      const r = data.records.find((x) => x.menu_id === m.id)
      next[m.id] = r ? { produced: String(r.produced), sold: String(r.sold), leftover: String(r.leftover) } : { ...emptyRow }
    }
    setRows(next)
    setErrors({})
  }, [data])

  const setField = (menuId: string, field: keyof Row, value: string) => {
    if (value !== '' && !/^\d{0,5}$/.test(value)) return
    setRows((r) => ({ ...r, [menuId]: { ...(r[menuId] ?? emptyRow), [field]: value } }))
    setErrors((e) => ({ ...e, [menuId]: '' }))
  }

  const totals = useMemo(() => {
    let produced = 0
    let leftover = 0
    let loss = 0
    for (const m of data?.menus ?? []) {
      const r = rows[m.id]
      if (!r?.produced) continue
      const p = Number(r.produced)
      const left = r.leftover === '' ? Math.max(0, p - Number(r.sold || 0)) : Number(r.leftover)
      produced += p
      leftover += left
      loss += left * m.hpp
    }
    return { produced, leftover, loss }
  }, [rows, data])

  async function save() {
    if (!data) return
    const payload: Omit<DailyRecord, 'id'>[] = []
    const errs: Record<string, string> = {}
    for (const m of data.menus) {
      const r = rows[m.id]
      if (!r || (r.produced === '' && r.sold === '' && r.leftover === '')) continue
      if (r.produced === '') { errs[m.id] = 'Isi jumlah diproduksi.'; continue }
      const produced = Number(r.produced)
      const sold = Number(r.sold || 0)
      const leftover = r.leftover === '' ? produced - sold : Number(r.leftover)
      if (sold + leftover > produced || leftover < 0) { errs[m.id] = 'Terjual + sisa tidak boleh melebihi diproduksi.'; continue }
      payload.push({ outlet_id: outlet.id, menu_id: m.id, record_date: date, produced, sold, leftover })
    }
    setErrors(errs)
    if (Object.keys(errs).length) return toast('Periksa kembali isian yang ditandai merah.', 'error')
    if (!payload.length) return toast('Belum ada angka yang diisi.', 'error')
    setSaving(true)
    const { error: err } = await supabase.from('daily_records').upsert(payload, { onConflict: 'menu_id,record_date' })
    setSaving(false)
    if (err) return toast(friendlyError(err), 'error')
    setRows((prev) => {
      const next = { ...prev }
      for (const p of payload) next[p.menu_id] = { produced: String(p.produced), sold: String(p.sold), leftover: String(p.leftover) }
      return next
    })
    toast(`Catatan ${payload.length} menu tersimpan.`)
  }

  function applyPhoto() {
    if (!photoFor) return
    const total = Math.round(photoItems.reduce((a, i) => a + i.estimated_portions, 0))
    setField(photoFor.id, 'leftover', String(total))
    setPhotoFor(null)
    setPhotoItems([])
    toast(`Sisa ${photoFor.name} diisi ${total} porsi dari foto. Jangan lupa simpan.`)
  }

  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>
  if (!data) return null

  if (data.menus.length === 0) {
    return (
      <EmptyState icon={<UtensilsCrossed className="size-6" />} title="Belum ada menu aktif" action={<Button onClick={onGoToMenu} icon={<Plus className="size-4" />}>Tambah menu</Button>}>
        Tambahkan menu beserta harga jual dan HPP terlebih dahulu.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Button variant="ghost" size="sm" onClick={() => setDate(addDays(date, -1))} aria-label="Hari sebelumnya"><ChevronLeft className="size-5" /></Button>
        <input type="date" className="input w-auto" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Tanggal catatan" />
        <Button variant="ghost" size="sm" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayISO()} aria-label="Hari berikutnya"><ChevronRight className="size-5" /></Button>
        <span className="text-sm font-semibold text-stone-600">{formatDateLong(date)}</span>
      </Card>

      <Alert tone="info">Kosongkan kolom <b>Sisa</b> agar dihitung otomatis (diproduksi − terjual), atau isi dari foto dengan AI Vision.</Alert>

      <div className="space-y-3">
        {data.menus.map((m) => {
          const r = rows[m.id] ?? emptyRow
          const auto = r.leftover === '' && r.produced !== '' ? Math.max(0, Number(r.produced) - Number(r.sold || 0)) : null
          return (
            <Card key={m.id} className={cn('p-3 sm:p-4', errors[m.id] && 'border-red-300')}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-stone-900">{m.name}</p>
                  <p className="text-xs text-stone-500">HPP {rupiah(m.hpp)} · jual {rupiah(m.price)}</p>
                </div>
                {data.records.some((x) => x.menu_id === m.id) && <Badge tone="good">Tersimpan</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['produced', 'sold', 'leftover'] as const).map((f) => (
                  <div key={f}>
                    <label htmlFor={`${m.id}-${f}`} className="mb-1 block text-xs font-semibold text-stone-600">
                      {f === 'produced' ? 'Diproduksi' : f === 'sold' ? 'Terjual' : 'Sisa'}
                    </label>
                    <div className="relative">
                      <input
                        id={`${m.id}-${f}`}
                        inputMode="numeric"
                        className={cn('input text-center font-semibold', f === 'leftover' && 'pr-10')}
                        placeholder={f === 'leftover' && auto !== null ? `${auto}` : '0'}
                        value={r[f]}
                        onChange={(e) => setField(m.id, f, e.target.value)}
                      />
                      {f === 'leftover' && (
                        <button
                          type="button"
                          onClick={() => setPhotoFor(m)}
                          className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-brand-700 hover:bg-brand-50"
                          aria-label={`Isi sisa ${m.name} dari foto`}
                          title="Isi dari foto"
                        >
                          <Camera className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {errors[m.id] && <p className="mt-2 text-xs font-medium text-red-600">{errors[m.id]}</p>}
            </Card>
          )
        })}
      </div>

      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <Card className="flex flex-wrap items-center justify-between gap-3 p-3 shadow-lg">
          <p className="text-sm text-stone-600">
            Sisa <b className="text-stone-900">{totals.leftover} porsi</b> dari {totals.produced} · rugi{' '}
            <b className="text-accent-600">{rupiah(totals.loss)}</b>
          </p>
          <Button onClick={save} loading={saving} icon={<Save className="size-4" />}>Simpan catatan</Button>
        </Card>
      </div>

      <Modal open={Boolean(photoFor)} onClose={() => setPhotoFor(null)} title={`Isi sisa ${photoFor?.name ?? ''} dari foto`}>
        {photoFor && (
          <div className="space-y-4">
            <VisionCapture menus={[photoFor.name]} onItemsChange={(items) => setPhotoItems(items)} />
            <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
              <p className="text-sm">Total: <b>{Math.round(photoItems.reduce((a, i) => a + i.estimated_portions, 0))} porsi</b></p>
              <Button onClick={applyPhoto} disabled={!photoItems.length}>Gunakan sebagai sisa</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manajemen menu
// ---------------------------------------------------------------------------
type MenuForm = { id?: string; name: string; price: string; hpp: string }

function MenuManager() {
  const outlet = useOutlet()
  const toast = useToast()
  const { data: menus, loading, error, reload } = useAsync(() => fetchMenus(outlet.id, true), [outlet.id])
  const [form, setForm] = useState<MenuForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const price = Number(form.price)
    const hpp = Number(form.hpp)
    if (!form.name.trim()) return setFormError('Nama menu wajib diisi.')
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(hpp) || hpp < 0) return setFormError('Harga dan HPP harus angka positif.')
    setSaving(true)
    const values = { name: form.name.trim(), price: Math.round(price), hpp: Math.round(hpp) }
    const { error: err } = form.id
      ? await supabase.from('menus').update(values).eq('id', form.id)
      : await supabase.from('menus').insert({ ...values, outlet_id: outlet.id })
    setSaving(false)
    if (err) return setFormError(friendlyError(err))
    toast(form.id ? 'Menu diperbarui.' : 'Menu ditambahkan.')
    setForm(null)
    reload()
  }

  async function toggle(m: Menu) {
    const { error: err } = await supabase.from('menus').update({ is_active: !m.is_active }).eq('id', m.id)
    if (err) return toast(friendlyError(err), 'error')
    toast(m.is_active ? `${m.name} dinonaktifkan. Riwayatnya tetap tersimpan.` : `${m.name} diaktifkan kembali.`)
    reload()
  }

  if (loading && !menus) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>

  const marginPreview = form && form.price !== '' && form.hpp !== '' ? Number(form.price) - Number(form.hpp) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          <b>HPP</b> = modal per porsi, dipakai menghitung kerugian waste. <b>Harga jual</b> dipakai menghitung omzet & laba.
        </p>
        <Button onClick={() => { setFormError(''); setForm({ name: '', price: '', hpp: '' }) }} icon={<Plus className="size-4" />}>Tambah menu</Button>
      </div>

      {menus && menus.length === 0 && (
        <EmptyState icon={<UtensilsCrossed className="size-6" />} title="Belum ada menu">Tambahkan menu pertama kamu.</EmptyState>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {menus?.map((m) => {
          const margin = m.price - m.hpp
          return (
            <Card key={m.id} className={cn('p-4', !m.is_active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-stone-900">{m.name}</p>
                  {!m.is_active && <Badge>Nonaktif</Badge>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setFormError(''); setForm({ id: m.id, name: m.name, price: String(m.price), hpp: String(m.hpp) }) }} className="grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label={`Ubah ${m.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => toggle(m)} className="grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label={m.is_active ? `Nonaktifkan ${m.name}` : `Aktifkan ${m.name}`} title={m.is_active ? 'Nonaktifkan (riwayat tetap ada)' : 'Aktifkan kembali'}>
                    {m.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-stone-500">Harga jual</dt><dd className="font-semibold">{rupiah(m.price)}</dd></div>
                <div><dt className="text-xs text-stone-500">HPP</dt><dd className="font-semibold">{rupiah(m.hpp)}</dd></div>
                <div>
                  <dt className="text-xs text-stone-500">Untung/porsi</dt>
                  <dd className={cn('font-semibold', margin < 0 ? 'text-red-600' : 'text-brand-700')}>{rupiah(margin)}</dd>
                </div>
              </dl>
            </Card>
          )
        })}
      </div>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Ubah menu' : 'Tambah menu'}>
        {form && (
          <form onSubmit={submit} className="space-y-4">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <Field label="Nama menu" htmlFor="mname">
              <input id="mname" className="input" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Nasi Ayam Goreng" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga jual / porsi (Rp)" htmlFor="mprice">
                <input id="mprice" className="input" inputMode="numeric" value={form.price} onChange={(e) => /^\d{0,7}$/.test(e.target.value) && setForm({ ...form, price: e.target.value })} placeholder="15000" />
              </Field>
              <Field label="HPP / porsi (Rp)" htmlFor="mhpp" hint="Modal bahan, gas, kemasan">
                <input id="mhpp" className="input" inputMode="numeric" value={form.hpp} onChange={(e) => /^\d{0,7}$/.test(e.target.value) && setForm({ ...form, hpp: e.target.value })} placeholder="9000" />
              </Field>
            </div>
            {marginPreview !== null && (
              <Alert tone={marginPreview < 0 ? 'danger' : 'good'}>
                {marginPreview < 0 ? `Rugi ${rupiah(-marginPreview)} per porsi. HPP lebih besar dari harga jual.` : `Untung ${rupiah(marginPreview)} per porsi terjual.`}
              </Alert>
            )}
            <Button type="submit" className="w-full" loading={saving}>{form.id ? 'Simpan perubahan' : 'Tambah menu'}</Button>
          </form>
        )}
      </Modal>
    </div>
  )
}
