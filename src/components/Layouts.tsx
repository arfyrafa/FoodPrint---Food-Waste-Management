import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Apple, ArrowLeft, ChartPie, ChefHat, HandPlatter, House, LogOut, Menu as MenuIcon, NotebookPen, Receipt, ScanLine,
  Settings, ShoppingBag, UserRound, X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { demoMode } from '../lib/supabase'
import { resetDemoData } from '../lib/mockSupabase'
import type { Role } from '../lib/types'
import { Alert, Button, PageSkeleton, cn } from './ui'

export function Logo({ size = 'md', to = '/' }: { size?: 'sm' | 'md'; to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="FoodPrint beranda">
      <img src="/logo-mark.png" alt="" className={size === 'sm' ? 'h-8 w-auto' : 'h-10 w-auto'} />
      <span className={cn('font-extrabold tracking-tight', size === 'sm' ? 'text-lg' : 'text-xl')}>
        <span className="text-brand-800">Food</span>
        <span className="text-accent-500">print</span>
      </span>
    </Link>
  )
}

/** Tombol teks "Kembali ke beranda" (lebih jelas daripada mengandalkan klik logo). */
export function BackLink({ to = '/', label = 'Kembali ke beranda', onClick }: { to?: string; label?: string; onClick?: () => void }) {
  const cls = 'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-stone-700 hover:bg-white hover:text-brand-800'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        <ArrowLeft className="size-4" /> {label}
      </button>
    )
  }
  return (
    <Link to={to} className={cls}>
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )
}

export function homeFor(role: Role | undefined) {
  return role === 'owner' ? '/dashboard' : '/home'
}

/** Halaman yang wajib login dengan role tertentu. */
export function RequireRole({ role }: { role: Role }) {
  const { session, profile, loading, signedOut, signOut } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-5">
        <PageSkeleton />
      </div>
    )
  }
  if (!session) return signedOut ? <Navigate to="/" replace /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert tone="danger" title="Profil akun tidak ditemukan">
          Pastikan schema.sql sudah dijalankan di Supabase sebelum akun dibuat.
        </Alert>
        <Button className="mt-4" variant="outline" onClick={signOut}>Keluar</Button>
      </div>
    )
  }
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />
  return <Outlet />
}

export function ConfigWarning() {
  if (!demoMode) return null
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      <b>Mode demo lokal:</b> data contoh tersimpan di browser ini dan fitur AI memakai hasil cadangan. Isi Supabase di file .env untuk versi asli.{' '}
      <button
        className="font-semibold underline"
        onClick={() => {
          resetDemoData()
          window.location.reload()
        }}
      >
        Reset data demo
      </button>
    </div>
  )
}

/** tile: warna kotak ikon di sidebar (tiap menu punya warna sendiri agar mudah dikenali) */
type NavItem = { to: string; label: string; icon: ReactNode; tile?: string }

const OWNER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <ChartPie className="size-5" />, tile: 'bg-brand-100 text-brand-700' },
  { to: '/input', label: 'Catatan', icon: <NotebookPen className="size-5" />, tile: 'bg-amber-100 text-amber-700' },
  { to: '/waste', label: 'AI Vision', icon: <ScanLine className="size-5" />, tile: 'bg-sky-100 text-sky-700' },
  { to: '/forecast', label: 'Prediksi', icon: <ChefHat className="size-5" />, tile: 'bg-accent-100 text-accent-600' },
  { to: '/surplus/manage', label: 'Surplus', icon: <HandPlatter className="size-5" />, tile: 'bg-rose-100 text-rose-600' },
  { to: '/orders', label: 'Pesanan', icon: <Receipt className="size-5" />, tile: 'bg-violet-100 text-violet-700' },
  { to: '/settings', label: 'Pengaturan', icon: <Settings className="size-5" />, tile: 'bg-stone-200 text-stone-700' },
]
const OWNER_MOBILE = OWNER_NAV.slice(0, 5)

const CUSTOMER_NAV: NavItem[] = [
  { to: '/home', label: 'Beranda', icon: <House className="size-5" /> },
  { to: '/surplus', label: 'Surplus', icon: <HandPlatter className="size-5" /> },
  { to: '/nutrition', label: 'Cek Gizi', icon: <Apple className="size-5" /> },
  { to: '/my-orders', label: 'Pesanan', icon: <Receipt className="size-5" /> },
  { to: '/profile', label: 'Profil', icon: <UserRound className="size-5" /> },
]

function SideLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/surplus'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-2 py-2 text-[15px] font-semibold transition-colors',
          isActive ? 'bg-brand-700 text-white' : 'text-stone-700 hover:bg-stone-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('grid size-9 place-items-center rounded-lg', isActive ? 'bg-white/15 text-white' : (item.tile ?? 'bg-stone-100 text-stone-600'))}>
            {item.icon}
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/surplus'}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-stone-500')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function UserBox() {
  const { profile, outlet, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="truncate text-sm font-bold text-stone-800">{outlet?.business_name ?? profile?.full_name ?? 'Pengguna'}</p>
      <p className="text-xs text-stone-500">{profile?.role === 'owner' ? 'Admin restoran' : 'Customer'}</p>
      <button
        onClick={async () => {
          navigate('/')
          await signOut()
        }}
        className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline"
      >
        <LogOut className="size-4" /> Keluar
      </button>
    </div>
  )
}

export function OwnerLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen">
      <ConfigWarning />
      {/* header mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo size="sm" to="/dashboard" />
        <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl hover:bg-stone-100" aria-label="Buka menu">
          <MenuIcon className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="fade-in ml-auto flex h-full w-72 flex-col gap-1 bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <Logo size="sm" to="/dashboard" />
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-stone-100" aria-label="Tutup menu">
                <X className="size-5" />
              </button>
            </div>
            {OWNER_NAV.map((item) => <SideLink key={item.to} item={item} onClick={() => setOpen(false)} />)}
            <SideLink item={{ to: '/surplus', label: 'Lihat halaman publik', icon: <ShoppingBag className="size-5" /> }} onClick={() => setOpen(false)} />
            <div className="mt-auto"><UserBox /></div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 border-r border-stone-200 bg-white p-4 lg:flex">
          <div className="mb-5 px-1"><Logo to="/dashboard" /></div>
          {OWNER_NAV.map((item) => <SideLink key={item.to} item={item} />)}
          <div className="mt-auto"><UserBox /></div>
        </aside>
        <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav items={OWNER_MOBILE} />
    </div>
  )
}

/** Layout untuk halaman customer & halaman publik /surplus. */
export function CustomerLayout() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isCustomer = profile?.role === 'customer'
  return (
    <div className="min-h-screen">
      <ConfigWarning />
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo size="sm" to={isCustomer ? '/home' : '/'} />
          {isCustomer && (
            <nav className="hidden items-center gap-1 lg:flex">
              {CUSTOMER_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/surplus'}
                  className={({ isActive }) =>
                    cn('rounded-lg px-3 py-2 text-sm font-semibold', isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:text-stone-900')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-2">
            {!session && (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">Masuk</Link>
                <Link to="/register" className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800">Daftar</Link>
              </>
            )}
            {profile?.role === 'owner' && (
              <Link to="/dashboard" className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Ke Dashboard</Link>
            )}
            {isCustomer && (
              <button
                onClick={async () => {
                  navigate('/')
                  await signOut()
                }}
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 lg:flex"
              >
                <LogOut className="size-4" /> Keluar
              </button>
            )}
          </div>
        </div>
      </header>
      <main className={cn('mx-auto max-w-5xl px-4 pt-5 sm:px-6', isCustomer ? 'pb-28 lg:pb-10' : 'pb-10')}>
        <Outlet />
      </main>
      {isCustomer && <BottomNav items={CUSTOMER_NAV} />}
    </div>
  )
}
