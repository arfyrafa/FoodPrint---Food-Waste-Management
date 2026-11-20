import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Cpu,
  Database,
  HandPlatter,
  LayoutDashboard,
  Leaf,
  QrCode,
  Salad,
  ScanLine,
  ShieldCheck,
  TrendingDown,
  UserCheck,
  UtensilsCrossed,
} from 'lucide-react'
import { Logo, ConfigWarning, homeFor } from '../../components/Layouts'
import { useAuth } from '../../contexts/AuthContext'

export default function Landing() {
  const { session, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'owner' | 'customer'>('owner')
  const home = session && profile ? homeFor(profile.role) : null
  const homeLabel = profile?.role === 'owner' ? 'Buka Dashboard Kantin' : 'Buka Beranda Saya'

  return (
    <div className="min-h-screen bg-cream text-ink">
      <ConfigWarning />

      {/* Header Navigasi */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Logo />
          
          {/* Navigasi Desktop Anchor */}
          <nav className="hidden items-center gap-1 md:flex">
            <a
              href="#alur"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-brand-900"
            >
              Cara Kerja
            </a>
            <a
              href="#preview"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-brand-900"
            >
              Lihat Aplikasi
            </a>
            <a
              href="#solusi"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-brand-900"
            >
              Untuk Siapa
            </a>
            <a
              href="#teknologi"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-brand-900"
            >
              Teknologi AI
            </a>
            <Link
              to="/surplus"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 hover:text-brand-900"
            >
              Makanan Surplus
            </Link>
          </nav>

          {/* Sisi Kanan: Auth Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/surplus"
              className="inline-flex h-9 items-center rounded-xl px-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 md:hidden"
            >
              Surplus
            </Link>

            {home ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-stone-600 md:inline">
                  Masuk: <b>{profile?.role === 'owner' ? 'Admin Kantin' : 'Mahasiswa'}</b>
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Keluar
                </button>
                <Link
                  to={home}
                  className="inline-flex h-10 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  {homeLabel}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 hover:text-brand-900"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION DENGAN MOCKUP UI APLIKASI ASLI */}
        <section className="relative overflow-hidden border-b border-stone-200/80 bg-gradient-to-b from-brand-50/70 via-brand-50/20 to-cream pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            
            {/* Sisi Kiri: Pesan Utama & CTA */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-900 shadow-2xs">
                <UtensilsCrossed className="size-3.5 text-brand-700" />
                Manajemen Limbah Makanan Kantin Kampus & Food Rescue
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-900 sm:text-5xl sm:leading-[1.15]">
                Masak sesuai permintaan.{' '}
                <span className="text-accent-600">Salurkan yang berlebih.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
                FoodPrint membantu pengelola kantin kampus dan UMKM kuliner memprediksi jumlah porsi masak harian secara terukur,
                memantau kelayakan makanan dengan AI Vision, serta menyalurkan surplus layak makan kepada mahasiswa dengan harga terjangkau.
              </p>

              {/* Tombol Aksi Nyata */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-700 px-5 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:bg-brand-800 active:scale-[0.98]"
                >
                  Mulai Kelola Kantin
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/surplus"
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-stone-300 bg-white px-5 text-sm sm:text-base font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 active:scale-[0.98]"
                >
                  <HandPlatter className="size-4 text-accent-500" />
                  Jelajahi Surplus
                </Link>
              </div>

              {/* 3 Keunggulan Sejajar & Responsif */}
              <div className="mt-8 grid grid-cols-1 gap-2.5 border-t border-stone-200 pt-6 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-stone-200/70 text-xs font-semibold text-stone-800 shadow-2xs">
                  <CheckCircle2 className="size-4 text-brand-600 shrink-0" />
                  <span>Prediksi Rata-Rata Tertimbang</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-stone-200/70 text-xs font-semibold text-stone-800 shadow-2xs">
                  <CheckCircle2 className="size-4 text-brand-600 shrink-0" />
                  <span>AI Vision Gizi & Kelayakan</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-stone-200/70 text-xs font-semibold text-stone-800 shadow-2xs">
                  <CheckCircle2 className="size-4 text-brand-600 shrink-0" />
                  <span>Pengambilan via Barcode 128</span>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Mockup Tampilan Aplikasi Asli + Floating Cards */}
            <div className="relative pt-4 sm:pt-6">
              
              {/* Floating Card 1 (Atas Kanan): Prediksi Masak */}
              <div className="absolute -top-2 right-2 z-20 hidden items-center gap-2.5 rounded-2xl border border-brand-200/90 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md sm:flex animate-bounce duration-1000">
                <div className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-800">
                  <ChefHat className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Prediksi Besok</p>
                  <p className="text-xs font-extrabold text-brand-900">42 Porsi <span className="font-semibold text-emerald-700">(Hemat ~Rp85rb)</span></p>
                </div>
              </div>

              {/* Window Frame Mockup */}
              <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xl shadow-stone-900/5 ring-1 ring-stone-900/5">
                
                {/* Window Title Bar */}
                <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/90 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="rounded-md bg-stone-200/70 px-3 py-0.5 font-mono text-[11px] text-stone-600">
                    foodprint.id/dashboard · Kantin Kampus Utama
                  </div>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700 text-[11px]">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                </div>

                {/* Window Body: Komposit Interface Nyata */}
                <div className="p-4 sm:p-5 space-y-3.5 bg-stone-50/30">
                  
                  {/* Mini Stats Banner Dashboard */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-stone-200 bg-white p-2.5 shadow-2xs">
                      <p className="text-[10px] font-medium text-stone-500">Porsi Terbuang Hari Ini</p>
                      <p className="text-base font-extrabold text-stone-800">4 porsi <span className="text-[11px] font-semibold text-emerald-700">(-62% vs rata-rata)</span></p>
                    </div>
                    <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-2.5 shadow-2xs">
                      <p className="text-[10px] font-medium text-brand-700">Efisiensi Bahan Terjaga</p>
                      <p className="text-base font-extrabold text-brand-900">Rp85.000 <span className="text-[11px] font-normal text-brand-700">/ hari</span></p>
                    </div>
                  </div>

                  {/* Rekomendasi Produksi Harian (AI Forecast Snippet) */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">1</span>
                        <div>
                          <p className="text-xs font-bold text-stone-900">Ayam Bakar Madu</p>
                          <p className="text-[10px] text-stone-500">Rekomendasi Produksi Kamis</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <TrendingDown className="size-3" /> Turun 13 Porsi
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between rounded-xl bg-stone-50 p-2 text-xs">
                      <span className="text-stone-500">Produksi Lalu: <b>55 porsi</b></span>
                      <span className="text-brand-900 font-extrabold">Saran Masak: 42 porsi</span>
                    </div>
                  </div>

                  {/* Etalase Penyaluran Surplus Food */}
                  <div className="rounded-2xl border border-accent-200/80 bg-accent-50/40 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                          <HandPlatter className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">Nasi Gudeg Telur Komplit</p>
                          <p className="text-[10px] text-stone-500">Sisa 4 porsi · Siap ambil di kasir</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 line-through">Rp18.000</span>
                        <p className="text-xs font-extrabold text-accent-700">Rp9.000 (-50%)</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-[11px] text-stone-600 border-t border-accent-100 pt-2">
                      <span className="flex items-center gap-1 font-medium text-brand-800">
                        <ShieldCheck className="size-3.5 text-brand-600" /> Lolos Cek Kelayakan AI
                      </span>
                      <span className="font-mono text-stone-500">Batas: 19:30 WIB</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Floating Card 2 (Bawah Kiri): Surplus Rescue Badge */}
              <div className="absolute -bottom-4 -left-3 z-20 flex items-center gap-2.5 rounded-2xl border border-accent-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
                <div className="grid size-8 place-items-center rounded-xl bg-accent-100 text-accent-700">
                  <HandPlatter className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Surplus Siap Ambil</p>
                  <p className="text-xs font-extrabold text-stone-900">Sisa 4 porsi <span className="font-semibold text-accent-600">· Diskon 50%</span></p>
                </div>
              </div>

              {/* Floating Card 3 (Bawah Kanan): AI Vision Status */}
              <div className="absolute -bottom-4 -right-3 z-20 hidden items-center gap-2.5 rounded-2xl border border-sky-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md sm:flex">
                <div className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-700">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">AI Vision Mutu</p>
                  <p className="text-xs font-extrabold text-sky-900">Layak Konsumsi <span className="font-semibold text-stone-600">(Aman)</span></p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* STATS IMPACT BAND: TRANSPARAN & DENGAN SUMBER JELAS */}
        <section className="border-b border-stone-200/80 bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
              <div className="border-l-2 border-brand-500 pl-4">
                <p className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">~30%</p>
                <p className="mt-1 text-xs font-bold text-stone-700 uppercase tracking-wide">Target Reduksi Limbah</p>
                <p className="mt-0.5 text-xs text-stone-500 leading-snug">Estimasi penurunan porsi sisa lewat algoritma rata-rata tertimbang</p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <p className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">Rp85.000</p>
                <p className="mt-1 text-xs font-bold text-stone-700 uppercase tracking-wide">Estimasi Hemat HPP / Hari</p>
                <p className="mt-0.5 text-xs text-stone-500 leading-snug">Pencegahan modal bahan berlebih pada menu utama di hari sepi</p>
              </div>

              <div className="border-l-2 border-accent-500 pl-4">
                <p className="text-2xl font-extrabold tracking-tight text-accent-600 sm:text-3xl">Diskon s/d 50%</p>
                <p className="mt-1 text-xs font-bold text-stone-700 uppercase tracking-wide">Penyelamatan Surplus</p>
                <p className="mt-0.5 text-xs text-stone-500 leading-snug">Porsi layak makan harga terjangkau bagi mahasiswa</p>
              </div>

              <div className="border-l-2 border-emerald-600 pl-4">
                <div className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">
                  <Leaf className="size-6 text-emerald-600" /> SDG 12
                </div>
                <p className="mt-1 text-xs font-bold text-stone-700 uppercase tracking-wide">Konservasi Pangan</p>
                <p className="mt-0.5 text-xs text-stone-500 leading-snug">Aksi nyata konsumsi dan produksi bertanggung jawab di kampus</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ALUR 3 LANGKAH TERINTEGRASI (DENGAN ILUSTRASI & PANAH) */}
        <section id="alur" className="border-b border-stone-200/80 bg-stone-100/70 py-16 sm:py-20 scroll-mt-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Alur Operasional</span>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-900 sm:text-3xl">
                Bagaimana FoodPrint menghentikan pemborosan makanan
              </h2>
              <p className="mt-2 text-stone-600 text-sm sm:text-base">
                Tiga tahapan praktis sebelum, saat, dan sesudah jam operasional kantin untuk menjaga margin usaha dan menyediakan makanan murah bagi mahasiswa.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              
              {/* Tahap 1: Prediksi Produksi Harian */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs border-t-4 border-t-brand-600">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-brand-100 font-extrabold text-brand-800 text-sm">
                      1
                    </div>
                    <span className="text-[11px] font-semibold text-brand-800 uppercase tracking-wide">Pagi Hari</span>
                  </div>

                  {/* Ilustrasi UI Miniatur */}
                  <div className="mt-4 rounded-xl bg-brand-50/60 p-3 border border-brand-100/80">
                    <div className="flex items-center justify-between text-xs font-bold text-brand-900">
                      <span>Rekomendasi Masak</span>
                      <span className="text-emerald-700">42 Porsi</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>Pola Rabu lalu: 55</span>
                        <span>Kamis: Turun 13</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full w-[76%]" />
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-stone-900">1. Prediksi Produksi Harian</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                    Sistem menghitung jumlah porsi masak rekomendasi berdasarkan pola penjualan hari yang sama. AI menerjemahkan angka ke saran aksi juru masak.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-brand-700 font-semibold">
                  <span>Cegah Overproduksi</span>
                  <ChevronRight className="size-4" />
                </div>
              </div>

              {/* Tahap 2: AI Vision Cek Kelayakan */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs border-t-4 border-t-sky-600">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 font-extrabold text-sky-800 text-sm">
                      2
                    </div>
                    <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wide">Sore Hari</span>
                  </div>

                  {/* Ilustrasi UI Miniatur */}
                  <div className="mt-4 rounded-xl bg-sky-50/60 p-3 border border-sky-100/80">
                    <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                      <span className="flex items-center gap-1"><ScanLine className="size-3.5 text-sky-600" /> Analisis Visual</span>
                      <span className="text-sky-700">Layak Makan</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
                      <div className="rounded bg-white p-1 border border-sky-100">Prot <b>28%</b></div>
                      <div className="rounded bg-white p-1 border border-sky-100">Karb <b>45%</b></div>
                      <div className="rounded bg-white p-1 border border-sky-100">Lemak <b>18%</b></div>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-stone-900">2. AI Vision Cek Kelayakan</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                    Foto makanan sisa untuk memeriksa estimasi profil nutrisi makro dan kelayakan konsumsi fisik secara visual sebelum didaftarkan ke etalase surplus.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-sky-700 font-semibold">
                  <span>Verifikasi Kualitas</span>
                  <ChevronRight className="size-4" />
                </div>
              </div>

              {/* Tahap 3: Penyaluran via Barcode */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs border-t-4 border-t-accent-600">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-accent-100 font-extrabold text-accent-800 text-sm">
                      3
                    </div>
                    <span className="text-[11px] font-semibold text-accent-800 uppercase tracking-wide">Tutup Kantin</span>
                  </div>

                  {/* Ilustrasi UI Miniatur */}
                  <div className="mt-4 rounded-xl bg-accent-50/60 p-3 border border-accent-100/80 text-center">
                    <div className="flex items-center justify-between text-xs font-bold text-accent-950">
                      <span>Barcode Code 128</span>
                      <span className="text-accent-700">Diskon 50%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1 rounded bg-white py-1.5 border border-accent-100 font-mono text-[11px] font-bold text-stone-700">
                      <QrCode className="size-3.5 text-stone-500" />
                      <span>FP-2601-OK</span>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-stone-900">3. Penyaluran via Barcode</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                    Mahasiswa memesan secara online, mendapatkan barcode unik, dan membayar di kasir kantin saat mengambil. Stok terpotong otomatis tanpa repot.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-accent-700 font-semibold">
                  <span>Zero Food Waste</span>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 3: LIHAT APLIKASINYA (INTERACTIVE APP SHOWCASE) */}
        <section id="preview" className="border-b border-stone-200/80 bg-white py-16 sm:py-20 scroll-mt-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-700">Pratinjau Antarmuka</span>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-900 sm:text-3xl">
                Lihat Bagaimana FoodPrint Bekerja
              </h2>
              <p className="mt-2 text-stone-600 text-sm sm:text-base">
                Didesain intuitif dan ramah perangkat seluler untuk juru masak kantin maupun mahasiswa kampus.
              </p>

              {/* Tab Selector */}
              <div className="mt-8 inline-flex rounded-2xl bg-stone-100 p-1.5 border border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('owner')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                    activeTab === 'owner'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard Pengelola Kantin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('customer')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                    activeTab === 'customer'
                      ? 'bg-accent-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <UserCheck className="size-4" />
                  <span>Portal Mahasiswa & Pembeli</span>
                </button>
              </div>
            </div>

            {/* Tab Content Display */}
            <div className="mt-10">
              {activeTab === 'owner' ? (
                /* Showcase Tab 1: Dashboard Kantin */
                <div className="overflow-hidden rounded-3xl border-2 border-brand-200 bg-stone-50/50 p-4 sm:p-7 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-700">Tampilan Pengelola</span>
                      <h3 className="text-xl font-extrabold text-stone-900">Dashboard Finansial & Prediksi Produksi</h3>
                    </div>
                    <Link
                      to="/login"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800"
                    >
                      Buka Dashboard Kantin <ArrowRight className="size-3.5" />
                    </Link>
                  </div>

                  {/* Mockup Metrics Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
                      <p className="text-[11px] font-semibold text-stone-500">Porsi Terbuang</p>
                      <p className="mt-1 text-lg font-black text-stone-800">4 porsi</p>
                      <p className="text-[10px] font-semibold text-emerald-700">3.8% dari total masak</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
                      <p className="text-[11px] font-semibold text-stone-500">Estimasi Rugi HPP</p>
                      <p className="mt-1 text-lg font-black text-rose-700">Rp32.000</p>
                      <p className="text-[10px] text-stone-500">Bahan sisa × biaya HPP</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
                      <p className="text-[11px] font-semibold text-stone-500">Omzet Penjualan</p>
                      <p className="mt-1 text-lg font-black text-stone-900">Rp1.420.000</p>
                      <p className="text-[10px] text-stone-500">98 porsi terjual hari ini</p>
                    </div>
                    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3.5">
                      <p className="text-[11px] font-semibold text-brand-800">Potensi Hemat</p>
                      <p className="mt-1 text-lg font-black text-brand-900">Rp85.000</p>
                      <p className="text-[10px] font-semibold text-brand-700">Prediksi masak besok</p>
                    </div>
                  </div>

                  {/* Mockup Tabel Prediksi AI */}
                  <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
                    <p className="text-xs font-bold text-stone-800 uppercase tracking-wide">Rekomendasi Masak Hari Kerja Berikutnya</p>
                    <div className="mt-3 divide-y divide-stone-100 text-xs">
                      <div className="flex items-center justify-between py-2">
                        <span className="font-bold text-stone-900">Ayam Bakar Madu</span>
                        <span className="font-semibold text-stone-500">Lalu: 55 porsi</span>
                        <span className="font-extrabold text-brand-900">Saran: 42 porsi (-13)</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">Keyakinan Tinggi</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="font-bold text-stone-900">Soto Ayam Lamongan</span>
                        <span className="font-semibold text-stone-500">Lalu: 40 porsi</span>
                        <span className="font-extrabold text-brand-900">Saran: 38 porsi (-2)</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">Keyakinan Tinggi</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="font-bold text-stone-900">Gado-Gado Komplit</span>
                        <span className="font-semibold text-stone-500">Lalu: 25 porsi</span>
                        <span className="font-extrabold text-brand-900">Saran: 24 porsi (-1)</span>
                        <span className="rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-700">Keyakinan Sedang</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Showcase Tab 2: Portal Mahasiswa */
                <div className="overflow-hidden rounded-3xl border-2 border-accent-200 bg-stone-50/50 p-4 sm:p-7 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-accent-700">Tampilan Mahasiswa</span>
                      <h3 className="text-xl font-extrabold text-stone-900">Cek Gizi AI & Pemesanan Makanan Surplus</h3>
                    </div>
                    <Link
                      to="/surplus"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-accent-700"
                    >
                      Buka Makanan Surplus <ArrowRight className="size-3.5" />
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {/* Kolom 1: Target Nutrisi & Cek Gizi */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800">Target Gizi Harian Saya</span>
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-800">Target: Makan Seimbang</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Energi: 1.450 / 2.100 kkal</span>
                            <span className="text-brand-700">69%</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full bg-brand-600 rounded-full w-[69%]" />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Protein: 72 / 85 g</span>
                            <span className="text-brand-700">84%</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full bg-accent-500 rounded-full w-[84%]" />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-stone-50 p-2.5 text-xs text-stone-600 border border-stone-100">
                        <b>Hasil Cek Gizi AI:</b> Nasi Ayam Bakar memenuhi 520 kkal dan 32g protein, cocok dengan target makan siang Anda.
                      </div>
                    </div>

                    {/* Kolom 2: Kartu Barcode Pesanan Masuk */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-stone-900">Pesanan Surplus Aktif</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-extrabold border border-emerald-200">Siap Diambil</span>
                        </div>
                        <p className="mt-2 text-sm font-extrabold text-stone-900">Nasi Gudeg Telur Komplit (1 porsi)</p>
                        <p className="text-xs text-stone-500">Kantin Utama · Total bayar di kasir: <b>Rp9.000</b></p>
                      </div>

                      <div className="mt-4 rounded-xl bg-stone-50 p-3 text-center border border-dashed border-stone-300">
                        <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold tracking-widest text-stone-800">
                          <QrCode className="size-4 text-stone-600" />
                          <span>FP-8924-AB</span>
                        </div>
                        <p className="mt-1 text-[10px] text-stone-500">Tunjukkan barcode atau sebutkan kode ini ke kasir kantin</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 4: DUA PERAN, SATU EKOSISTEM */}
        <section id="solusi" className="border-b border-stone-200/80 bg-stone-50/70 py-16 sm:py-20 scroll-mt-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Dua Sisi Solusi</span>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-900 sm:text-3xl">
                Didesain untuk Pengelola Usaha dan Mahasiswa
              </h2>
              <p className="mt-2 text-stone-600 text-sm sm:text-base">
                Menghubungkan efisiensi biaya operasional kantin dengan kebutuhan pangan terjangkau dan sehat bagi civitas kampus.
              </p>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {/* Kolom 1: Untuk Admin Restoran / Kantin */}
              <div className="flex flex-col justify-between rounded-3xl border-2 border-brand-200/90 bg-white p-7 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-brand-800">
                      <ChefHat className="size-5 text-brand-600" />
                      <span>Untuk Pengelola Kantin & UMKM</span>
                    </div>
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
                      Dashboard Usaha
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold text-stone-900">Kendalikan Biaya & Stop Rugi HPP</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    Bukan sekadar mencatat penjualan, tapi memberikan wawasan konkret untuk memangkas porsi yang sering terbuang.
                  </p>

                  <ul className="mt-5 space-y-3 text-sm text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <span><b>Dashboard Finansial:</b> Pantau porsi terbuang, omzet, laba kotor, dan rasio kerugian secara transparan.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <span><b>Laporan Untung-Rugi Menu:</b> Deteksi langsung menu mana yang paling boros biaya bahan.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <span><b>Verifikasi Pesanan Cepat:</b> Cukup ketik atau scan barcode pesanan saat pembeli tiba di kasir.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-stone-100 pt-5">
                  <Link
                    to="/login"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white transition hover:bg-brand-800"
                  >
                    Masuk sebagai Pengelola Kantin
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              {/* Kolom 2: Untuk Mahasiswa / Customer */}
              <div className="flex flex-col justify-between rounded-3xl border-2 border-accent-200/90 bg-white p-7 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-accent-700">
                      <Salad className="size-5 text-accent-600" />
                      <span>Untuk Mahasiswa & Pembeli</span>
                    </div>
                    <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-800">
                      Portal Mahasiswa
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold text-stone-900">Makan Hemat, Gizi Tetap Terkontrol</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    Dapatkan makanan layak makan dengan diskon signifikan, sekaligus pantau asupan nutrisi sesuai target kesehatan harian.
                  </p>

                  <ul className="mt-5 space-y-3 text-sm text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" />
                      <span><b>Makanan Surplus Terjangkau:</b> Diskon hingga 50% untuk menu layak makan yang belum terjual di kantin.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" />
                      <span><b>Cek Gizi Cerdas:</b> Analisis kalori dan zat gizi sebelum makan, disesuaikan dengan target dietmu.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" />
                      <span><b>Pesan Tanpa Repot:</b> Bayar tunai atau QRIS di kasir kantin saat pengambilan via barcode unik.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-stone-100 pt-5">
                  <Link
                    to="/surplus"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 font-semibold text-white transition hover:bg-accent-700"
                  >
                    Jelajahi Makanan Surplus
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: TEKNOLOGI DI BALIK FOODPRINT */}
        <section id="teknologi" className="border-b border-stone-200/80 bg-white py-16 sm:py-20 scroll-mt-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Fondasi Sistem</span>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-900 sm:text-3xl">
                Teknologi di Balik FoodPrint
              </h2>
              <p className="mt-2 text-stone-600 text-sm sm:text-base">
                Kombinasi algoritma statistik deterministik dan kecerdasan artifisial mutakhir untuk keandalan maksimal.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  <BarChart3 className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-stone-900">Weighted Moving Average</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  Algoritma peramalan deterministik tanpa risiko halusinasi. Mengalkulasi tren penjualan di hari yang sama dengan pembobotan historis dan buffer pengaman 5%.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                  <Cpu className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-stone-900">Google Gemini Multimodal AI</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  Menganalisis foto makanan untuk estimasi makronutrisi dan tanda visual kesegaran secara instan. Menjaga privasi karena foto tidak disimpan di database.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-100 text-accent-800">
                  <Database className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-stone-900">Supabase RLS & Barcode 128</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  Keamanan data antar-kantin terisolasi penuh melalui PostgreSQL Row Level Security, serta verifikasi pesanan cepat via pemindaian barcode Code 128 atomik.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Bawah Ringkas & Tidak Berulang */}
        <section className="bg-brand-900 py-16 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Siap mengurangi limbah makanan di kantin kampusmu?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100 text-sm sm:text-base">
              Kelola porsi masak harian secara presisi, selamatkan makanan berlebih, dan wujudkan kampus hijau yang ramah lingkungan.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/surplus"
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 font-semibold text-brand-900 shadow-sm transition hover:bg-brand-50"
              >
                <HandPlatter className="size-4 text-accent-600" />
                Jelajahi Makanan Surplus
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl border border-brand-700 bg-brand-800/80 px-6 font-semibold text-white transition hover:bg-brand-800"
              >
                Masuk ke Aplikasi
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-stone-200 bg-white py-8 text-xs text-stone-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-stone-400">|</span>
            <span>Techtonic ampe Wisuda · IT RUSH 2026</span>
          </div>
          <p className="text-center text-stone-500 sm:text-right">
            Platform Pengelolaan Limbah Makanan & Marketplace Surplus Terpadu.
          </p>
        </div>
      </footer>
    </div>
  )
}
