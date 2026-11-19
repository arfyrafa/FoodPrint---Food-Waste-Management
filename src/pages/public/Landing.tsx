import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  HandPlatter,
  Salad,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react'
import { Logo, ConfigWarning, homeFor } from '../../components/Layouts'
import { useAuth } from '../../contexts/AuthContext'

export default function Landing() {
  const { session, profile, signOut } = useAuth()
  const home = session && profile ? homeFor(profile.role) : null
  const homeLabel = profile?.role === 'owner' ? 'Buka Dashboard Kantin' : 'Buka Beranda Saya'

  return (
    <div className="min-h-screen bg-cream text-ink">
      <ConfigWarning />

      {/* Header Navigasi */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/surplus"
              className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 hover:text-brand-900"
            >
              Makanan Surplus
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
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="border-b border-stone-200/70 bg-gradient-to-b from-brand-50/70 via-cream to-cream pt-10 pb-16 sm:pt-14 sm:pb-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            
            {/* Sisi Kiri: Pesan Utama & CTA */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-100/70 px-3 py-1 text-xs font-bold text-brand-800">
                <UtensilsCrossed className="size-3.5 text-brand-700" />
                Manajemen Limbah Makanan Kantin Kampus
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
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/login?demo=owner"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white shadow-sm transition hover:bg-brand-800 active:scale-[0.98]"
                >
                  Mulai sebagai Pengelola Kantin
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/surplus"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 active:scale-[0.98]"
                >
                  <HandPlatter className="size-4 text-accent-500" />
                  Jelajahi Makanan Surplus
                </Link>
              </div>

              {/* Bukti & Nilai Praktis */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-200 pt-6 text-xs text-stone-600 sm:text-sm">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 text-brand-600" /> Prediksi rata-rata tertimbang
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 text-brand-600" /> AI Vision gizi & kelayakan
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 text-brand-600" /> Pengambilan via barcode
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Visual Branding FoodPrint */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-md rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-7">
                <img
                  src="/logo-full.png"
                  alt="FoodPrint Logo"
                  className="mx-auto w-full max-w-[260px]"
                />
                <div className="mt-6 space-y-2.5 border-t border-stone-100 pt-5">
                  <div className="flex items-center gap-3 rounded-xl bg-brand-50/80 p-3 text-xs text-brand-900">
                    <ChefHat className="size-4 shrink-0 text-brand-700" />
                    <span><b>Prediksi Produksi:</b> Masak terukur dari riwayat penjualan harian</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-sky-50/80 p-3 text-xs text-sky-900">
                    <ShieldCheck className="size-4 shrink-0 text-sky-700" />
                    <span><b>AI Vision:</b> Cek visual kelayakan makanan & profil nutrisi</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-accent-50/80 p-3 text-xs text-accent-900">
                    <HandPlatter className="size-4 shrink-0 text-accent-700" />
                    <span><b>Surplus Food:</b> Salurkan makanan berlebih layak makan ke mahasiswa</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 2: ALUR 3 LANGKAH TERINTEGRASI */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Alur Operasional</span>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-900 sm:text-3xl">
                Bagaimana FoodPrint menghentikan pemborosan makanan
              </h2>
              <p className="mt-2 text-stone-600">
                Tiga tahapan praktis sebelum, saat, dan sesudah jam buka kantin untuk menjaga margin usaha dan memberi makanan murah bagi mahasiswa.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {/* Tahap 1 */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-800">
                  1
                </div>
                <h3 className="mt-4 text-lg font-bold text-stone-900">Prediksi Produksi Harian</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Sistem menghitung rekomendasi jumlah masak berdasarkan pola riwayat hari yang sama. AI menerjemahkan angka tersebut ke dalam saran aksi yang mudah dipahami juru masak.
                </p>
              </div>

              {/* Tahap 2 */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 font-bold text-sky-800">
                  2
                </div>
                <h3 className="mt-4 text-lg font-bold text-stone-900">AI Vision Cek Kelayakan</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Foto makanan sisa untuk memeriksa estimasi gizi makro dan status kelayakan makan secara visual. Makanan yang lolos verifikasi siap didaftarkan ke etalase surplus.
                </p>
              </div>

              {/* Tahap 3 */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-100 font-bold text-accent-800">
                  3
                </div>
                <h3 className="mt-4 text-lg font-bold text-stone-900">Penyaluran via Barcode</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Mahasiswa memesan secara online, mendapatkan barcode unik, dan membayar di tempat saat mengambil makanan. Stok terpotong otomatis tanpa kerumitan administrasi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: DUA PERAN, SATU EKOSISTEM */}
        <section className="border-t border-stone-200 bg-stone-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-700">Dua Sisi Solusi</span>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-900 sm:text-3xl">
                Didesain untuk Pengelola Usaha dan Mahasiswa
              </h2>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {/* Kolom 1: Untuk Admin Restoran / Kantin */}
              <div className="flex flex-col justify-between rounded-3xl border border-brand-200/80 bg-white p-7 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-brand-800">
                    <ChefHat className="size-5 text-brand-600" />
                    <span>Untuk Pengelola Kantin & UMKM</span>
                  </div>
                  <h3 className="mt-2 text-xl font-extrabold text-stone-900">Kendalikan Biaya & Stop Rugi HPP</h3>
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
                      <span><b>Verifikasi Pesanan Cepat:</b> Cukup ketik atau scan barcode pesanan saat pembeli tiba.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-stone-100 pt-5">
                  <Link
                    to="/login?demo=owner"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white transition hover:bg-brand-800"
                  >
                    Masuk sebagai Pengelola Kantin
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              {/* Kolom 2: Untuk Mahasiswa / Customer */}
              <div className="flex flex-col justify-between rounded-3xl border border-accent-200/80 bg-white p-7 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-accent-700">
                    <Salad className="size-5 text-accent-600" />
                    <span>Untuk Mahasiswa & Pembeli</span>
                  </div>
                  <h3 className="mt-2 text-xl font-extrabold text-stone-900">Makan Hemat, Gizi Tetap Terkontrol</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    Dapatkan makanan layak makan dengan diskon signifikan, sekaligus pantau asupan nutrisi sesuai target kesehatan harian.
                  </p>

                  <ul className="mt-5 space-y-3 text-sm text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" />
                      <span><b>Makanan Surplus Terjangkau:</b> Diskon besar untuk menu layak makan yang belum terjual di kantin terdekat.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" />
                      <span><b>Cek Gizi Cerdas:</b> Analisis kalori dan zat gizi sebelum makan, disesuaikan dengan target dietmu.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" />
                      <span><b>Pesan Tanpa Repot:</b> Bayar tunai atau QRIS di kasir kantin saat pengambilan.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-stone-100 pt-5">
                  <Link
                    to="/login?demo=customer"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 font-semibold text-white transition hover:bg-accent-700"
                  >
                    Masuk sebagai Mahasiswa
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Bawah */}
        <section className="border-t border-stone-200 bg-brand-900 py-14 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Siap mengurangi limbah makanan di kantin kampusmu?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              Mulai kelola porsi masak secara presisi atau nikmati makanan surplus layak makan dengan harga bersahabat.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/login?demo=owner"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-brand-900 shadow-sm transition hover:bg-brand-50"
              >
                Masuk sebagai Pengelola Kantin
              </Link>
              <Link
                to="/login?demo=customer"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-brand-700 bg-brand-800/80 px-5 font-semibold text-white transition hover:bg-brand-800"
              >
                Masuk sebagai Mahasiswa
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
