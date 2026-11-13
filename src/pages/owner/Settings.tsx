import { useState, type FormEvent } from 'react'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, Field, PageHeader } from '../../components/ui'
import { useAuth, useOutlet } from '../../contexts/AuthContext'
import { friendlyError, supabase } from '../../lib/supabase'
import { BUSINESS_TYPE_LABEL, type BusinessType } from '../../lib/types'

export default function Settings() {
  const outlet = useOutlet()
  const { refresh } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(outlet.business_name)
  const [type, setType] = useState<BusinessType>(outlet.business_type)
  const [address, setAddress] = useState(outlet.address ?? '')
  const [wa, setWa] = useState(outlet.whatsapp ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const digits = wa.replace(/\D/g, '')
    if (!name.trim()) return setError('Nama usaha wajib diisi.')
    if (digits && (digits.length < 9 || digits.length > 15)) return setError('Nomor WhatsApp tidak valid.')
    setBusy(true)
    const { error: err } = await supabase
      .from('outlets')
      .update({ business_name: name.trim(), business_type: type, address: address.trim() || null, whatsapp: digits ? digits.replace(/^0/, '62') : null })
      .eq('id', outlet.id)
    setBusy(false)
    if (err) return setError(friendlyError(err))
    await refresh()
    toast('Profil usaha disimpan.')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pengaturan usaha" subtitle="Informasi ini tampil di halaman Surplus Food untuk customer." />
      <Card className="p-4 sm:p-6">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Nama usaha" htmlFor="oname">
            <input id="oname" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Jenis usaha" htmlFor="otype">
            <select id="otype" className="input" value={type} onChange={(e) => setType(e.target.value as BusinessType)}>
              {Object.entries(BUSINESS_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Alamat / lokasi" htmlFor="oaddr">
            <input id="oaddr" className="input" maxLength={160} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Contoh: Gedung A lt. 1, Kampus ITSB" />
          </Field>
          <Field label="Nomor WhatsApp" htmlFor="owa" hint="Contoh: 081234567890. Dipakai tombol hubungi.">
            <input id="owa" className="input" inputMode="tel" maxLength={20} value={wa} onChange={(e) => setWa(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>Simpan</Button>
        </form>
      </Card>
    </div>
  )
}
