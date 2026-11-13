import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Camera, HeartHandshake, Salad, Sparkles, Store, UtensilsCrossed } from 'lucide-react'
import { Logo, ConfigWarning, homeFor } from '../../components/Layouts'
import { useAuth } from '../../contexts/AuthContext'

const OWNER_FEATURES = [
  { icon: Sparkles, title: 'Prediksi produksi besok', text: 'Rekomendasi porsi per menu dari pola penjualan hari yang sama, lengkap dengan penjelasan AI.' },
  { icon: Camera, title: 'AI Vision sisa makanan', text: 'Foto sisa makanan, AI mengenali kategori (karbohidrat, protein, sayur) dan perkiraan porsi.' },
  { icon: BarChart3, title: 'Dashboard untung & rugi', text: 'Lihat porsi terbuang, kerugian Rupiah, dan laba tiap menu dalam satu layar.' },
  { icon: HeartHandshake, title: 'Salurkan makanan surplus', text: 'Pasang sisa yang masih layak dengan harga miring, lengkap dengan checklist keamanan pangan.' },
]

export default function Landing() {
  const { session, profile } = useAuth()
  const home = session && profile ? homeFor(profile.role) : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-cream to-cream">
      <ConfigWarning />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/surplus" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-white sm:block">Surplus Food</Link>
          {home ? (
            <Link to={home} className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Buka aplikasi</Link>
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-white">Masuk</Link>
              <Link to="/register" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Daftar</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-14 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-700">
            <UtensilsCrossed className="size-3.5" /> Untuk kantin kampus & UMKM kuliner
          </span>
          <h1 className="mt-4 text-4xl leading-[1.1] font-extrabold tracking-tight text-brand-900 sm:text-5xl">
            Stop wasting food,<br />
            <span className="text-accent-500">start predicting demand.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            FoodPrint membantu pengelola usaha kuliner memasak sesuai permintaan. Catat produksi dan sisa, dapatkan
            rekomendasi produksi besok, dan salurkan makanan surplus ke mahasiswa dengan harga terjangkau.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/login?demo=owner" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
              Coba demo admin restoran <ArrowRight className="size-4" />
            </Link>
            <Link to="/surplus" className="inline-flex h-12 items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-800 hover:bg-stone-50">
              <Store className="size-4" /> Lihat makanan surplus
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm md:max-w-md">
          <div className="absolute inset-6 rounded-full bg-brand-200/50 blur-3xl" />
          <img src="/logo-full.png" alt="Logo FoodPrint" className="relative w-full" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 className="text-2xl font-extrabold text-brand-900">Untuk admin restoran</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OWNER_FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><f.icon className="size-5" /></span>
              <h3 className="mt-3 font-bold text-stone-900">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 rounded-3xl bg-brand-800 p-6 text-white sm:p-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">Untuk customer</h2>
            <p className="mt-2 text-brand-100">
              Pesan makanan surplus dari kantin terdekat dengan harga lebih murah, lalu ambil langsung di tempat.
              Cek dulu kandungan gizinya dengan AI agar sesuai program diet kamu.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/login?demo=customer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-4 font-semibold text-white hover:bg-accent-600">
                Coba demo customer <ArrowRight className="size-4" />
              </Link>
              <Link to="/register?role=customer" className="inline-flex h-11 items-center rounded-xl bg-white/10 px-4 font-semibold hover:bg-white/20">
                Daftar sebagai customer
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-4"><HeartHandshake className="mb-2 size-5 text-accent-300" />Harga miring, bahkan gratis</div>
            <div className="rounded-2xl bg-white/10 p-4"><Salad className="mb-2 size-5 text-accent-300" />Cek gizi & kecocokan diet dengan AI</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        FoodPrint oleh Tim Techtonic ampe Wisuda · IT RUSH 2026 · Data pada akun demo adalah data simulasi.
      </footer>
    </div>
  )
}
