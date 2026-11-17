import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, ImagePlus, Info, Pencil, Plus, Save, UtensilsCrossed } from 'lucide-react'
import { MenuAvatar, menuColor } from '../../components/MenuAvatar'
import { PhotoField } from '../../components/PhotoField'
import { useToast } from '../../components/Toast'
import { Alert, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, PageSkeleton, Segmented, cn } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { fetchMenus, useAsync } from '../../lib/data'
import { addDays, formatDateLong, rupiah, todayISO } from '../../lib/format'
import { friendlyError, supabase } from '../../lib/supabase'
import type { DailyRecord, Menu } from '../../lib/types'

export default function InputPage() {
  const [params, setParams] = useSearchParams()
  const tab: 'daily' | 'menu' = params.get('tab') === 'menu' ? 'menu' : 'daily'
  const dateParam = params.get('date')
  const initialDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= todayISO() ? dateParam : todayISO()
  const setTab = (t: 'daily' | 'menu') => setParams(t === 'menu' ? { tab: 'menu' } : {}, { replace: true })
  return (
    <div>
      <PageHeader
        title="Catatan & Menu"
        subtitle="Catat produksi, terjual, dan sisa setiap hari. Atur harga jual dan HPP di tab Menu."
        action={<Segmented value={tab} onChange={setTab} options={[{ value: 'daily', label: 'Catatan harian' }, { value: 'menu', label: 'Daftar menu' }]} />}
      />
      {tab === 'daily' ? <DailyForm key={initialDate} initialDate={initialDate} onGoToMenu={() => setTab('menu')} /> : <MenuManager />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Catatan harian
// ---------------------------------------------------------------------------
type Row = { produced: string; sold: string }

/** Sisa selalu otomatis: diproduksi - terjual (null jika belum diisi / tidak valid). */
function computeLeftover(r: Row): number | null {
  if (r.produced === '') return null
  const left = Number(r.produced) - Number(r.sold || 0)
  return left >= 0 ? left : null
}

const FIELD_STYLE = {
  produced: { box: 'bg-stone-50', label: 'text-stone-600', dot: 'bg-stone-400' },
  sold: { box: 'bg-brand-50', label: 'text-brand-800', dot: 'bg-brand-500' },
  leftover: { box: 'bg-amber-50', label: 'text-amber-800', dot: 'bg-amber-400' },
} as const
const emptyRow: Row = { produced: '', sold: '' }

function DailyForm({ onGoToMenu, initialDate }: { onGoToMenu: () => void; initialDate: string }) {
  const outlet = useOutlet()
  const toast = useToast()
  const [date, setDate] = useState(initialDate)
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, loading, error } = useAsync(async () => {
    const [menus, recs] = await Promise.all([
      fetchMenus(outlet.id, false, true),
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
      next[m.id] = r ? { produced: String(r.produced), sold: String(r.sold) } : { ...emptyRow }
    }
    setRows(next)
    setErrors({})
  }, [data])

  const setField = (menuId: string, field: keyof Row, value: string) => {
    if (value !== '' && !/^\d{0,5}$/.test(value)) return
    setRows((r) => ({ ...r, [menuId]: { ...(r[menuId] ?? emptyRow), [field]: value } }))
    setErrors((e) => ({ ...e, [menuId]: '' }))
  }

  const savedCount = data ? data.menus.filter((m) => data.records.some((x) => x.menu_id === m.id)).length : 0

  const totals = useMemo(() => {
    let produced = 0
    let leftover = 0
    let loss = 0
    for (const m of data?.menus ?? []) {
      const r = rows[m.id]
      if (!r?.produced) continue
      const p = Number(r.produced)
      const left = computeLeftover(r) ?? 0
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
      if (!r || (r.produced === '' && r.sold === '')) continue
      if (r.produced === '') { errs[m.id] = 'Isi jumlah diproduksi.'; continue }
      const produced = Number(r.produced)
      const sold = Number(r.sold || 0)
      if (sold > produced) { errs[m.id] = 'Terjual tidak boleh lebih dari diproduksi.'; continue }
      const leftover = produced - sold
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
      for (const p of payload) next[p.menu_id] = { produced: String(p.produced), sold: String(p.sold) }
      return next
    })
    toast(`Catatan ${payload.length} menu tersimpan.`)
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
      <div className="overflow-hidden rounded-2xl bg-brand-800 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(addDays(date, -1))} className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="Hari sebelumnya"><ChevronLeft className="size-5" /></button>
            <div className="px-1">
              <p className="text-xs text-brand-200">{date === todayISO() ? 'Hari ini' : 'Tanggal catatan'}</p>
              <p className="text-lg font-extrabold">{formatDateLong(date)}</p>
            </div>
            <button onClick={() => setDate(addDays(date, 1))} disabled={date >= todayISO()} className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30" aria-label="Hari berikutnya"><ChevronRight className="size-5" /></button>
          </div>
          <input type="date" className="rounded-xl border-0 bg-white/10 px-3 py-2 text-sm text-white [color-scheme:dark]" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pilih tanggal" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 text-center">
          <div className="py-2.5"><p className="text-xs text-brand-200">Menu tercatat</p><p className="font-bold">{savedCount}/{data.menus.length}</p></div>
          <div className="py-2.5"><p className="text-xs text-brand-200">Sisa</p><p className="font-bold">{totals.leftover} porsi</p></div>
          <div className="py-2.5"><p className="text-xs text-brand-200">Rugi</p><p className="font-bold text-accent-300">{rupiah(totals.loss)}</p></div>
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-stone-600">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-600" />
        Cukup isi Diproduksi dan Terjual. Sisa dan rugi dihitung otomatis.
      </p>

      <div className="space-y-3">
        {data.menus.map((m) => {
          const r = rows[m.id] ?? emptyRow
          const left = computeLeftover(r)
          const over = r.produced !== '' && r.sold !== '' && Number(r.sold) > Number(r.produced)
          return (
            <Card key={m.id} className={cn('p-3 sm:p-4', (errors[m.id] || over) && 'border-red-300 ring-2 ring-red-100')}>
              <div className="mb-3 flex items-center gap-3">
                <MenuAvatar name={m.name} photo={m.photo_url} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-stone-900">{m.name}</p>
                  <p className="text-xs text-stone-500">Modal {rupiah(m.hpp)} · jual {rupiah(m.price)}</p>
                </div>
                {data.records.some((x) => x.menu_id === m.id) ? <Badge tone="good">Tersimpan</Badge> : <Badge>Belum diisi</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['produced', 'sold'] as const).map((f) => (
                  <div key={f} className={cn('rounded-xl p-2', FIELD_STYLE[f].box)}>
                    <label htmlFor={`${m.id}-${f}`} className={cn('mb-1 flex items-center gap-1.5 text-xs font-bold', FIELD_STYLE[f].label)}>
                      <span className={cn('size-2 rounded-full', FIELD_STYLE[f].dot)} />
                      {f === 'produced' ? 'Diproduksi' : 'Terjual'}
                    </label>
                    <input
                      id={`${m.id}-${f}`}
                      inputMode="numeric"
                      className="input bg-white text-center text-lg font-bold"
                      placeholder="0"
                      value={r[f]}
                      onChange={(e) => setField(m.id, f, e.target.value)}
                    />
                  </div>
                ))}
                {/* Sisa otomatis = diproduksi - terjual */}
                <div className={cn('rounded-xl p-2', FIELD_STYLE.leftover.box)}>
                  <p className={cn('mb-1 flex items-center gap-1.5 text-xs font-bold', FIELD_STYLE.leftover.label)}>
                    <span className={cn('size-2 rounded-full', FIELD_STYLE.leftover.dot)} /> Sisa <span className="font-normal opacity-70">(otomatis)</span>
                  </p>
                  <div className="flex h-[46px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50/60" aria-live="polite" aria-label={`Sisa ${m.name}`}>
                    <span className="text-lg font-bold text-stone-900">{left ?? '–'}</span>
                  </div>
                </div>
                {/* Rugi per menu = sisa x modal per porsi (sama dengan perhitungan di dashboard) */}
                <div className="rounded-xl bg-accent-50 p-2">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-accent-700">
                    <span className="size-2 rounded-full bg-accent-500" /> Rugi
                  </p>
                  <div className="flex h-[46px] items-center justify-center rounded-xl border border-accent-200 bg-white px-2" aria-live="polite">
                    <span className="text-base font-extrabold text-accent-600">{rupiah((left ?? 0) * m.hpp)}</span>
                  </div>
                </div>
              </div>
              {over && <p className="mt-2 text-xs font-medium text-red-600">Terjual tidak boleh lebih dari diproduksi.</p>}
              {r.produced !== '' && Number(r.produced) > 0 && (
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                  <div className="bg-brand-500" style={{ width: `${Math.min(100, (Number(r.sold || 0) / Number(r.produced)) * 100)}%` }} />
                  <div className="bg-amber-400" style={{ width: `${Math.min(100, ((left ?? 0) / Number(r.produced)) * 100)}%` }} />
                </div>
              )}
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

    </div>
  )
}

// ---------------------------------------------------------------------------
// Manajemen menu
// ---------------------------------------------------------------------------
type MenuForm = { id?: string; name: string; price: string; hpp: string; photo: string | null }


function MenuManager() {
  const outlet = useOutlet()
  const toast = useToast()
  const { data: menus, loading, error, reload } = useAsync(() => fetchMenus(outlet.id, true, true), [outlet.id])
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
    if (!form.photo) return setFormError('Foto menu wajib diisi.')
    setSaving(true)
    const values = { name: form.name.trim(), price: Math.round(price), hpp: Math.round(hpp), photo_url: form.photo }
    const { error: err } = form.id
      ? await supabase.from('menus').update(values).eq('id', form.id)
      : await supabase.from('menus').insert({ ...values, outlet_id: outlet.id })
    setSaving(false)
    if (err) return setFormError(friendlyError(err))
    toast(form.id ? 'Menu diperbarui.' : 'Menu ditambahkan.')
    setForm(null)
    reload()
  }

  function openEdit(m: Menu) {
    setFormError('')
    setForm({ id: m.id, name: m.name, price: String(m.price), hpp: String(m.hpp), photo: m.photo_url ?? null })
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
          <b>Modal per porsi</b> dipakai menghitung kerugian dari sisa. <b>Harga jual</b> dipakai menghitung omzet & laba.
        </p>
        <Button onClick={() => { setFormError(''); setForm({ name: '', price: '', hpp: '', photo: null }) }} icon={<Plus className="size-4" />}>Tambah menu</Button>
      </div>

      {menus && menus.some((m) => !m.photo_url) && (
        <Alert tone="warn">{menus.filter((m) => !m.photo_url).length} menu belum punya foto. Tekan <b>Tambah foto</b> pada kartunya, foto akan tampil juga di Surplus Food untuk customer.</Alert>
      )}

      {menus && menus.length === 0 && (
        <EmptyState icon={<UtensilsCrossed className="size-6" />} title="Belum ada menu">Tambahkan menu pertama kamu.</EmptyState>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {menus?.map((m) => {
          const profit = m.price - m.hpp
          const profitPct = m.price > 0 ? Math.round((profit / m.price) * 100) : 0
          return (
            <Card key={m.id} className={cn('group overflow-hidden transition-all duration-200 hover:shadow-md', !m.is_active && 'opacity-60 grayscale')}>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                {m.photo_url ? (
                  <>
                    <img src={m.photo_url} alt={m.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {/* Gradient overlay di atas agar tombol aksi selalu kontras */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 via-black/10 to-transparent" />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className={cn('flex size-full flex-col items-center justify-center gap-2.5 transition-colors hover:brightness-95', menuColor(m.name))}
                  >
                    <div className="grid size-14 place-items-center rounded-2xl bg-white/80 shadow-xs backdrop-blur-xs">
                      <UtensilsCrossed className="size-7 opacity-75" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-extrabold tracking-wider uppercase opacity-80">{m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-stone-800 shadow-xs hover:bg-white">
                      <ImagePlus className="size-3.5 text-brand-600" /> Tambah foto
                    </span>
                  </button>
                )}

                {/* Tombol Aksi di Pojok Kanan Atas */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="grid size-9 place-items-center rounded-xl bg-white/90 text-stone-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-brand-800 hover:shadow active:scale-95"
                    aria-label={`Ubah ${m.name}`}
                    title="Ubah data atau ganti foto menu"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    className="grid size-9 place-items-center rounded-xl bg-white/90 text-stone-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-stone-900 hover:shadow active:scale-95"
                    aria-label={m.is_active ? `Nonaktifkan ${m.name}` : `Aktifkan ${m.name}`}
                    title={m.is_active ? 'Nonaktifkan (riwayat tetap ada)' : 'Aktifkan kembali'}
                  >
                    {m.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                  </button>
                </div>

                {!m.is_active && (
                  <span className="absolute top-2.5 left-2.5">
                    <Badge tone="default">Nonaktif</Badge>
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-base font-bold text-stone-900" title={m.name}>{m.name}</p>
                  {profit > 0 && (
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/50">
                      +{profitPct}%
                    </span>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 px-3 py-2">
                    <dt className="text-[11px] font-medium text-stone-500">Harga Jual</dt>
                    <dd className="mt-0.5 text-base font-bold text-stone-900">{rupiah(m.price)}</dd>
                  </div>
                  <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 px-3 py-2">
                    <dt className="text-[11px] font-medium text-stone-500">Modal (HPP)</dt>
                    <dd className="mt-0.5 text-base font-bold text-amber-800">{rupiah(m.hpp)}</dd>
                  </div>
                </dl>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Ubah menu' : 'Tambah menu'}>
        {form && (
          <form onSubmit={submit} className="space-y-4">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <PhotoField label="Foto menu" emptyText="Ambil / pilih foto menu" value={form.photo} onChange={(photo) => setForm({ ...form, photo })} onError={setFormError} />
            <Field label="Nama menu" htmlFor="mname">
              <input id="mname" className="input" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Nasi Ayam Goreng" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga jual / porsi (Rp)" htmlFor="mprice">
                <input id="mprice" className="input" inputMode="numeric" value={form.price} onChange={(e) => /^\d{0,7}$/.test(e.target.value) && setForm({ ...form, price: e.target.value })} placeholder="15000" />
              </Field>
              <Field label="Modal / porsi (Rp)" htmlFor="mhpp" hint="Bahan, gas, kemasan">
                <input id="mhpp" className="input" inputMode="numeric" value={form.hpp} onChange={(e) => /^\d{0,7}$/.test(e.target.value) && setForm({ ...form, hpp: e.target.value })} placeholder="9000" />
              </Field>
            </div>
            {marginPreview !== null && marginPreview < 0 && (
              <Alert tone="danger">Modal lebih besar dari harga jual. Periksa kembali angkanya.</Alert>
            )}
            <Button type="submit" className="w-full" loading={saving}>{form.id ? 'Simpan perubahan' : 'Tambah menu'}</Button>
          </form>
        )}
      </Modal>
    </div>
  )
}
