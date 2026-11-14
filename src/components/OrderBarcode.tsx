import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/**
 * Barcode (Code 128) dari kode pesanan. Penjual bisa memindai dengan scanner barcode
 * (yang bekerja seperti keyboard) di halaman Pesanan masuk, atau mengetik kodenya.
 */
export function OrderBarcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        displayValue: false,
        height: 72,
        width: 2.4,
        margin: 0,
        background: '#ffffff',
        lineColor: '#1d2a1b',
      })
    } catch {
      /* kode tidak valid: biarkan kosong, teks kode tetap tampil */
    }
  }, [value])

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-4">
      <svg ref={ref} role="img" aria-label={`Barcode pesanan ${value}`} className="h-[72px] w-full max-w-[280px]" preserveAspectRatio="none" />
      <p className="font-mono text-sm font-semibold tracking-[0.3em] text-stone-600">{value}</p>
    </div>
  )
}
