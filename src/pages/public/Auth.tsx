import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, Store } from 'lucide-react'
import { BackLink, ConfigWarning, Logo, homeFor } from '../../components/Layouts'
import { Alert, Button, Field, cn } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { demoMode, friendlyError, supabase } from '../../lib/supabase'
import { DEMO_CUSTOMER_EMAIL, DEMO_OWNER_EMAIL, DEMO_PASSWORD, startDemoRecovery } from '../../lib/mockSupabase'
import { BUSINESS_TYPE_LABEL, type BusinessType, type Role } from '../../lib/types'

const env = (k: string) => ((import.meta.env[k] as string | undefined) || undefined)
const DEMO = demoMode
  ? {
      owner: { email: DEMO_OWNER_EMAIL, password: DEMO_PASSWORD },
      customer: { email: DEMO_CUSTOMER_EMAIL, password: DEMO_PASSWORD },
    }
  : {
      owner: { email: env('VITE_DEMO_OWNER_EMAIL'), password: env('VITE_DEMO_OWNER_PASSWORD') },
      customer: { email: env('VITE_DEMO_CUSTOMER_EMAIL'), password: env('VITE_DEMO_CUSTOMER_PASSWORD') },
    }

function AuthShell({ title, subtitle, children, back }: { title: string; subtitle: string; children: React.ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-cream">
      <ConfigWarning />
      <div className="mx-auto flex max-w-md flex-col px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="-ml-2.5"><BackLink to={back?.to ?? '/'} label={back?.label ?? 'Kembali ke beranda'} /></div>
          <Logo size="sm" />
        </div>
        <div className="card p-6">
          <h1 className="text-2xl font-extrabold text-brand-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

/** Arahkan user yang sudah login ke halaman sesuai role-nya. */
function useRedirectIfLoggedIn(skip = false) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (skip || loading || !session || !profile) return null
  const target = from && (profile.role === 'owner') === !['/home', '/onboarding', '/my-orders', '/nutrition', '/profile'].includes(from) ? from : homeFor(profile.role)
  return <Navigate to={target} replace />
}

export function LoginPage() {
  const [params] = useSearchParams()
  const { session, signOut } = useAuth()
  const demoParam = params.get('demo')
  // Saat membuka /login?demo=..., jangan lempar ke akun yang sedang login: keluar dulu agar bisa ganti akun
  const [switching, setSwitching] = useState(Boolean(demoParam))
  const redirect = useRedirectIfLoggedIn(switching)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const demo = demoParam as 'owner' | 'customer' | null
    if (demo && DEMO[demo]?.email) {
      setEmail(DEMO[demo].email!)
      setPassword(DEMO[demo].password ?? '')
    }
  }, [demoParam])

  useEffect(() => {
    if (!switching) return
    if (session) signOut()
    else setSwitching(false)
  }, [switching, session, signOut])

  if (redirect) return redirect

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    setSwitching(false)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) setError(friendlyError(err))
  }

  const hasDemo = Boolean(DEMO.owner.email || DEMO.customer.email)

  return (
    <AuthShell title="Masuk" subtitle="Masuk sebagai admin restoran atau customer.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" state={{ email }} className="text-sm font-semibold text-brand-700 hover:underline">Lupa password?</Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={busy}>Masuk</Button>
      </form>

      {hasDemo && (
        <div className="mt-5 rounded-xl bg-stone-50 p-3">
          <p className="text-xs font-semibold text-stone-600">Akun demo untuk juri (data simulasi):</p>
          {demoMode && <p className="mt-0.5 text-xs text-stone-500">Mode demo lokal · password: <code>{DEMO_PASSWORD}</code></p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO.owner.email && (
              <Button type="button" size="sm" variant="outline" onClick={() => { setEmail(DEMO.owner.email!); setPassword(DEMO.owner.password ?? '') }}>
                Demo admin
              </Button>
            )}
            {DEMO.customer.email && (
              <Button type="button" size="sm" variant="outline" onClick={() => { setEmail(DEMO.customer.email!); setPassword(DEMO.customer.password ?? '') }}>
                Demo customer
              </Button>
            )}
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-sm text-stone-600">
        Belum punya akun? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Daftar</Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = useRedirectIfLoggedIn()
  const [role, setRole] = useState<Role>(params.get('role') === 'customer' ? 'customer' : 'owner')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('kantin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (redirect) return redirect

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password minimal 6 karakter.')
    if (role === 'owner' && !businessName.trim()) return setError('Nama usaha wajib diisi.')
    setBusy(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role,
          full_name: fullName.trim(),
          ...(role === 'owner' ? { business_name: businessName.trim(), business_type: businessType } : {}),
        },
      },
    })
    setBusy(false)
    if (err) return setError(friendlyError(err))
    if (!data.session) {
      setInfo('Pendaftaran berhasil! Cek email kamu untuk konfirmasi, lalu masuk.')
      return
    }
    navigate(homeFor(role), { replace: true })
  }

  const roleCard = (value: Role, icon: React.ReactNode, title: string, desc: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-colors',
        role === value ? 'border-brand-600 bg-brand-50' : 'border-stone-200 hover:border-stone-300',
      )}
    >
      <span className={role === value ? 'text-brand-700' : 'text-stone-500'}>{icon}</span>
      <span className="text-sm font-bold text-stone-900">{title}</span>
      <span className="text-xs text-stone-600">{desc}</span>
    </button>
  )

  return (
    <AuthShell title="Buat akun" subtitle="Pilih peran kamu terlebih dahulu.">
      {info ? (
        <div className="space-y-4">
          <Alert tone="good">{info}</Alert>
          <Link to="/login" className="block text-center font-semibold text-brand-700 hover:underline">Ke halaman masuk</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {roleCard('owner', <Store className="size-5" />, 'Admin restoran', 'Kelola menu, waste, dan prediksi')}
            {roleCard('customer', <ShoppingBag className="size-5" />, 'Customer', 'Beli makanan surplus & cek gizi')}
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Nama lengkap" htmlFor="name">
            <input id="name" className="input" required maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          {role === 'owner' && (
            <>
              <Field label="Nama usaha" htmlFor="bname">
                <input id="bname" className="input" required maxLength={80} placeholder="Contoh: Kantin Bu Siti" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </Field>
              <Field label="Jenis usaha" htmlFor="btype">
                <select id="btype" className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)}>
                  {Object.entries(BUSINESS_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Email" htmlFor="remail">
            <input id="remail" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="rpass" hint="Minimal 6 karakter">
            <input id="rpass" type="password" autoComplete="new-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>Daftar</Button>
          <p className="text-center text-sm text-stone-600">
            Sudah punya akun? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Masuk</Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}

// ---------------------------------------------------------------------------
// Lupa password: kirim link reset ke email
// ---------------------------------------------------------------------------
export function ForgotPasswordPage() {
  const location = useLocation()
  const [email, setEmail] = useState(((location.state as { email?: string } | null)?.email ?? '').trim())
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (err) return setError(friendlyError(err))
    setSent(true)
  }

  return (
    <AuthShell title="Lupa password" subtitle="Masukkan email akunmu. Kami kirim link untuk membuat password baru." back={{ to: '/login', label: 'Kembali ke masuk' }}>
      {sent ? (
        <div className="space-y-4">
          <Alert tone="good" title="Cek email kamu">
            Jika <b>{email}</b> terdaftar, link reset password sudah dikirim. Buka email tersebut lalu klik linknya. Cek juga folder Spam.
          </Alert>
          {demoMode && (
            <Alert tone="warn" title="Mode demo lokal">
              Email tidak benar-benar dikirim.{' '}
              <Link to={`/reset-password?demo_email=${encodeURIComponent(email.trim())}`} className="font-semibold underline">
                Lanjut buat password baru
              </Link>
            </Alert>
          )}
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Kirim ulang</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Email" htmlFor="femail">
            <input id="femail" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>Kirim link reset</Button>
        </form>
      )}
    </AuthShell>
  )
}

// ---------------------------------------------------------------------------
// Reset password: halaman tujuan link di email
// ---------------------------------------------------------------------------
export function ResetPasswordPage() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [demoTried, setDemoTried] = useState(false)
  // Link kedaluwarsa dari Supabase: #error=access_denied&error_code=otp_expired
  const linkError = typeof window !== 'undefined' && /error_code=|error=access_denied/.test(window.location.hash)

  useEffect(() => {
    const demoEmail = params.get('demo_email')
    if (demoMode && demoEmail && !demoTried) {
      setDemoTried(true)
      if (!startDemoRecovery(demoEmail)) setError('Email tidak terdaftar di data demo.')
    }
  }, [params, demoTried])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password minimal 6 karakter.')
    if (password !== confirm) return setError('Konfirmasi password tidak sama.')
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) return setError(friendlyError(err))
    setDone(true)
  }

  const waiting = loading || (demoMode && params.get('demo_email') && !demoTried)

  return (
    <AuthShell title="Buat password baru" subtitle="Password baru dipakai untuk masuk berikutnya." back={{ to: '/login', label: 'Kembali ke masuk' }}>
      {done ? (
        <div className="space-y-4">
          <Alert tone="good" title="Password berhasil diganti">Kamu sudah masuk dengan password baru.</Alert>
          <Button className="w-full" size="lg" onClick={() => navigate(homeFor(profile?.role), { replace: true })}>Lanjut</Button>
        </div>
      ) : waiting ? (
        <p className="text-sm text-stone-600">Memeriksa link...</p>
      ) : linkError || !session ? (
        <div className="space-y-4">
          <Alert tone="danger" title="Link tidak valid atau sudah kedaluwarsa">{error || 'Minta link reset password yang baru.'}</Alert>
          <Link to="/forgot-password" className="block text-center font-semibold text-brand-700 hover:underline">Minta link baru</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <p className="text-sm text-stone-600">Akun: <b>{session.user.email}</b></p>
          <Field label="Password baru" htmlFor="npass" hint="Minimal 6 karakter">
            <input id="npass" type="password" autoComplete="new-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Ulangi password baru" htmlFor="cpass">
            <input id="cpass" type="password" autoComplete="new-password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>Simpan password</Button>
        </form>
      )}
    </AuthShell>
  )
}
