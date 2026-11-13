import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, Field, PageHeader } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { friendlyError, supabase } from '../../lib/supabase'
import { DIET_GOAL_LABEL, type DietGoal } from '../../lib/types'
import { GOALS } from '../../lib/diet'

export default function ProfilePage() {
  const { profile, session, refresh, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [goal, setGoal] = useState<DietGoal>(profile?.diet_goal ?? 'seimbang')
  const [notes, setNotes] = useState(profile?.diet_notes ?? '')
  const [dailyTarget, setDailyTarget] = useState(String(profile?.daily_target ?? GOALS[profile?.diet_goal ?? 'seimbang'].defaultTarget))
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight ? String(profile.target_weight) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits && (digits.length < 9 || digits.length > 15)) return setError('Nomor HP tidak valid.')
    const dt = Number(dailyTarget)
    const tw = targetWeight ? Number(targetWeight.replace(',', '.')) : null
    if (!Number.isFinite(dt) || dt < 1 || dt > 10000) return setError('Target harian tidak valid.')
    if (tw !== null && (!Number.isFinite(tw) || tw < 20 || tw > 300)) return setError('Target berat harus 20–300 kg.')
    setBusy(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim(),
        phone: digits ? digits.replace(/^0/, '62') : null,
        diet_goal: goal,
        diet_notes: notes.trim() || null,
        daily_target: Math.round(dt),
        target_weight: tw,
      })
      .eq('id', profile!.id)
    setBusy(false)
    if (err) return setError(friendlyError(err))
    await refresh()
    toast('Profil disimpan.')
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Profil" subtitle={session?.user.email} />
      <Card className="p-4 sm:p-6">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Nama" htmlFor="pname">
            <input id="pname" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Nomor HP / WhatsApp" htmlFor="pphone" hint="Agar penjual bisa mengabari pesananmu.">
            <input id="pphone" className="input" inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Program / tujuan makan" htmlFor="pgoal" hint="Menentukan fokus dashboard dan acuan Cek Gizi AI.">
            <select
              id="pgoal"
              className="input"
              value={goal}
              onChange={(e) => {
                const g = e.target.value as DietGoal
                setGoal(g)
                setDailyTarget(String(GOALS[g].defaultTarget))
              }}
            >
              {Object.entries(DIET_GOAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Target ${GOALS[goal].metricLabel.toLowerCase()}/hari (${GOALS[goal].unit})`} htmlFor="pdt">
              <input id="pdt" className="input" inputMode="numeric" value={dailyTarget} onChange={(e) => /^\d{0,5}$/.test(e.target.value) && setDailyTarget(e.target.value)} />
            </Field>
            <Field label="Target berat (kg)" htmlFor="ptw" hint="Opsional">
              <input id="ptw" className="input" inputMode="decimal" value={targetWeight} onChange={(e) => /^\d{0,3}([.,]\d?)?$/.test(e.target.value) && setTargetWeight(e.target.value)} />
            </Field>
          </div>
          <Field label="Catatan makanan (opsional)" htmlFor="pnotes" hint="Contoh: vegetarian, tidak suka pedas.">
            <input id="pnotes" className="input" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>Simpan profil</Button>
        </form>
      </Card>
      <Button
        variant="outline"
        className="w-full text-red-600"
        icon={<LogOut className="size-4" />}
        onClick={async () => {
          navigate('/')
          await signOut()
        }}
      >
        Keluar
      </Button>
    </div>
  )
}
