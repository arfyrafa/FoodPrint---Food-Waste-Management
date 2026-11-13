import { Link } from 'react-router-dom'
import { Logo } from '../../components/Layouts'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <h1 className="text-2xl font-extrabold text-brand-900">Halaman tidak ditemukan</h1>
      <p className="text-stone-600">Alamat yang kamu buka tidak ada atau sudah dipindahkan.</p>
      <Link to="/" className="rounded-xl bg-brand-700 px-4 py-2.5 font-semibold text-white">Kembali ke beranda</Link>
    </div>
  )
}
