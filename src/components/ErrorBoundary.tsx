import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

const RELOAD_FLAG = 'foodprint-chunk-reload'

function isChunkError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|Loading chunk/i.test(msg)
}

/**
 * Menangkap error tampilan agar user tidak melihat layar kosong.
 * Jika penyebabnya file halaman gagal dimuat (misal setelah update/deploy), halaman dimuat ulang sekali otomatis.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FoodPrint]', error, info.componentStack)
    if (isChunkError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
    }
  }

  render() {
    const { error } = this.state
    if (!error) {
      sessionStorage.removeItem(RELOAD_FLAG)
      return this.props.children
    }
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="card p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="size-6" /></span>
          <h1 className="mt-3 text-xl font-extrabold text-stone-900">Halaman ini gagal ditampilkan</h1>
          <p className="mt-1 text-sm text-stone-600">
            {isChunkError(error)
              ? 'File halaman tidak bisa dimuat. Coba muat ulang. Jika masih gagal, jalankan npm install lalu npm run dev lagi.'
              : 'Terjadi kesalahan tak terduga. Coba muat ulang halaman.'}
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-stone-50 p-3 text-left text-xs whitespace-pre-wrap text-stone-600">{error.message}</pre>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white">
              <RotateCcw className="size-4" /> Muat ulang
            </button>
            <a href="/" className="inline-flex h-10 items-center rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700">Ke beranda</a>
          </div>
        </div>
      </div>
    )
  }
}
