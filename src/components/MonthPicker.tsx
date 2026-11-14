import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** Kalender pilihan BULAN (bukan hari). value & max berformat YYYY-MM-01. */
export function MonthPicker({ value, max, onChange, align = 'right' }: { value: string; max: string; onChange: (v: string) => void; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value.slice(0, 4)))
  const ref = useRef<HTMLDivElement>(null)
  const maxYear = Number(max.slice(0, 4))
  const maxMonth = Number(max.slice(5, 7))
  const selYear = Number(value.slice(0, 4))
  const selMonth = Number(value.slice(5, 7))

  useEffect(() => {
    if (!open) return
    setYear(selYear)
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, selYear])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Pilih bulan, sekarang ${MONTHS_LONG[selMonth - 1]} ${selYear}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50"
      >
        <CalendarDays className="size-4 text-accent-600" />
        {MONTHS[selMonth - 1]} {selYear}
        <ChevronDown className={cn('size-4 text-stone-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="dialog" aria-label="Pilih bulan" className={cn('fade-in absolute top-full z-50 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl', align === 'right' ? 'right-0' : 'left-0')}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear((y) => y - 1)} className="grid size-8 place-items-center rounded-lg hover:bg-stone-100" aria-label="Tahun sebelumnya">
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-bold text-stone-900">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} disabled={year >= maxYear} className="grid size-8 place-items-center rounded-lg hover:bg-stone-100 disabled:opacity-30" aria-label="Tahun berikutnya">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const disabled = year > maxYear || (year === maxYear && i + 1 > maxMonth)
              const selected = year === selYear && i + 1 === selMonth
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(`${year}-${String(i + 1).padStart(2, '0')}-01`)
                    setOpen(false)
                  }}
                  className={cn(
                    'rounded-lg py-2 text-sm font-semibold transition-colors',
                    selected ? 'bg-brand-700 text-white' : 'text-stone-700 hover:bg-brand-50',
                    disabled && 'cursor-not-allowed text-stone-300 hover:bg-transparent',
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
