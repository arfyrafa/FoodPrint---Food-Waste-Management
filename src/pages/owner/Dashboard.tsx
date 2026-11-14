import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, Download, Lightbulb, Store, TrendingUp } from 'lucide-react'
import { MonthPicker } from '../../components/MonthPicker'
import { ProfitLossChart, WasteLineChart, WeekdayChart } from '../../components/charts'
import { Alert, Button, Card, EmptyState, Segmented, SimulatedDataNote, Skeleton, cn } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { byWeekday, dailySeries, perMenu, summarize, toCsv } from '../../lib/analytics'
import { downloadText, fetchMenus, fetchRecords, useAsync } from '../../lib/data'
import { addDays, formatDate, formatDateLong, formatMonth, monthEnd, monthStart, num, pct, rupiah, todayISO } from '../../lib/format'

/** Kartu angka utama yang bisa diklik menuju halaman terkait. */
function KpiLink({ to, label, value, hint, cta, tone }: { to: string; label: string; value: React.ReactNode; hint: string; cta: string; tone: 'loss' | 'save' | 'profit' }) {
  const bar = { loss: 'bg-accent-500', save: 'bg-brand-500', profit: 'bg-amber-400' }[tone]
  return (
    <Link to={to} className="card group relative overflow-hidden p-4 transition-shadow hover:shadow-md">
      <span className={cn('absolute inset-y-0 left-0 w-1', bar)} />
      <p className="text-[13px] font-semibold text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:underline">
        {cta} <ArrowRight className="size-3.5" />
      </p>
    </Link>
  )
}

export default function Dashboard() {
  const outlet = useOutlet()
  const navigate = useNavigate()
  const today = todayISO()
  const [month, setMonth] = useState(monthStart(today))
  const [trendView, setTrendView] = useState<'daily' | 'weekday'>('daily')
  const to = month === monthStart(today) ? today : monthEnd(month)

  // Catatan terakhir (tidak tergantung bulan yang dipilih)
  const latest = useAsync(async () => {
    const [menus, records] = await Promise.all([fetchMenus(outlet.id, true), fetchRecords(outlet.id, addDays(today, -30), today)])
    const date = records.at(-1)?.record_date ?? null
    return { date, summary: summarize(date ? records.filter((r) => r.record_date === date) : [], menus) }
  }, [outlet.id, today])

  // Ringkasan bulan yang dipilih
  const { data, error, reload } = useAsync(async () => {
    const [menus, records] = await Promise.all([fetchMenus(outlet.id, true), fetchRecords(outlet.id, month, to)])
    return { menus, records, month }
  }, [outlet.id, month, to])

  const ready = data && data.month === month
  const view = useMemo(() => {
    if (!data) return null
    return {
      lastDate: data.records.at(-1)?.record_date ?? null,
      summary: summarize(data.records, data.menus),
      menus: perMenu(data.records, data.menus),
      series: dailySeries(data.records, data.menus),
      weekdays: byWeekday(data.records),
    }
  }, [data])

  const l = latest.data?.summary
  const period = view?.lastDate ? `${formatDate(month)} – ${formatDate(view.lastDate)}` : formatMonth(month)

  return (
    <div className="space-y-5">
      {/* Judul */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-[28px]">Dashboard</h1>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800 ring-1 ring-brand-200">
          <Store className="size-3.5" /> {outlet.business_name}
        </span>
      </div>

      {/* 1. Catatan terakhir */}
      {latest.data?.date && l && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-bold text-white">{latest.data.date === today ? 'Hari ini' : 'Catatan terakhir'}</span>
              <span className="text-sm font-semibold text-stone-800">{formatDateLong(latest.data.date)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to={`/input?date=${latest.data.date}`} className="text-sm font-semibold text-stone-600 hover:text-brand-700 hover:underline">Buka catatan</Link>
              <Link to="/forecast#kesimpulan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                <Lightbulb className="size-4" /> Kesimpulan
              </Link>
            </div>
          </div>
          {/* gap-px + latar abu-abu = garis sekat rapi di HP (2x2) maupun desktop (1x4) */}
          <div className="grid grid-cols-2 gap-px bg-stone-100 sm:grid-cols-4">
            {[
              { k: 'Diproduksi', v: num(l.produced), u: 'porsi', dot: 'bg-stone-400' },
              { k: 'Terjual', v: num(l.sold), u: 'porsi', dot: 'bg-brand-500' },
              { k: 'Sisa', v: num(l.leftover), u: `porsi · ${pct(l.wastePct)}`, dot: 'bg-amber-400' },
              { k: 'Rugi', v: rupiah(l.loss), u: 'dari sisa makanan', dot: 'bg-accent-500', hi: true },
            ].map((t) => (
              <div key={t.k} className={cn('px-4 py-3.5 sm:px-5', t.hi ? 'bg-accent-50' : 'bg-white')}>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <span className={cn('size-2 rounded-full', t.dot)} /> {t.k}
                </p>
                <p className={cn('mt-1 text-2xl font-extrabold tracking-tight', t.hi ? 'text-accent-600' : 'text-stone-900')}>{t.v}</p>
                <p className="text-xs text-stone-500">{t.u}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. Ringkasan bulanan: pilihan bulan berlaku untuk semua di bawahnya */}
      <section className="space-y-4 rounded-3xl border border-stone-200/80 bg-stone-50/70 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker value={month} max={monthStart(today)} onChange={setMonth} align="left" />
            <div>
              <p className="text-sm font-bold text-stone-900">Ringkasan {formatMonth(month)}</p>
              <p className="text-xs text-stone-500">{ready && view?.lastDate ? `Data ${period}` : ready ? 'Belum ada catatan' : 'Memuat...'}</p>
            </div>
          </div>
          {ready && data.records.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="size-4" />}
              onClick={() => downloadText(`foodprint-${outlet.business_name.replace(/\W+/g, '-')}-${month.slice(0, 7)}.csv`, toCsv(data.records, data.menus))}
            >
              Unduh CSV
            </Button>
          )}
        </div>

        {error ? (
          <Alert tone="danger" title="Gagal memuat data">{error} <button className="underline" onClick={reload}>Coba lagi</button></Alert>
        ) : !ready || !view ? (
          <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        ) : data.records.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="size-6" />}
            title={`Belum ada catatan di ${formatMonth(month)}`}
            action={<Link to="/input" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white">Isi catatan <ArrowRight className="size-4" /></Link>}
          >
            Pilih bulan lain, atau catat produksi, terjual, dan sisa setiap hari.
          </EmptyState>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiLink
                to={`/input?date=${view.lastDate ?? to}`}
                label="Kerugian waste"
                value={rupiah(view.summary.loss)}
                hint={`${num(view.summary.leftover)} porsi terbuang (${pct(view.summary.wastePct)})`}
                cta="Lihat catatan per tanggal"
                tone="loss"
              />
              <KpiLink
                to="/forecast"
                label="Potensi hemat"
                value={rupiah(view.summary.potentialSaving)}
                hint="jika produksi ikut rekomendasi"
                cta="Lihat prediksi produksi"
                tone="save"
              />
              <KpiLink
                to="/input?tab=menu"
                label="Laba bersih"
                value={<span className={view.summary.net < 0 ? 'text-red-600' : undefined}>{rupiah(view.summary.net)}</span>}
                hint={`omzet ${rupiah(view.summary.revenue)} − modal − waste`}
                cta="Atur harga & HPP menu"
                tone="profit"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="p-4 sm:p-5">
                <h2 className="font-bold text-stone-900">Untung & rugi per menu</h2>
                <p className="mb-3 text-sm text-stone-500">Hijau = laba penjualan, oranye = rugi karena sisa</p>
                <ProfitLossChart data={view.menus} />
              </Card>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-stone-900">Sisa makanan</h2>
                    <p className="text-sm text-stone-500">{trendView === 'daily' ? 'Klik titik tanggal untuk membuka catatannya' : 'Rata-rata % sisa per hari dalam seminggu'}</p>
                  </div>
                  <Segmented value={trendView} onChange={setTrendView} options={[{ value: 'daily', label: 'Per tanggal' }, { value: 'weekday', label: 'Per hari' }]} />
                </div>
                <div className="mt-3">
                  {trendView === 'daily' ? <WasteLineChart data={view.series} onDayClick={(d) => navigate(`/input?date=${d}`)} /> : <WeekdayChart data={view.weekdays} />}
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
                <div>
                  <h2 className="font-bold text-stone-900">Menu paling boros</h2>
                  <p className="text-sm text-stone-500">Klik menu untuk melihat rekomendasi produksinya</p>
                </div>
                <Link to={`/input?date=${view.lastDate ?? to}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                  Catatan harian <ArrowRight className="size-4" />
                </Link>
              </div>
              <ul className="mt-2 divide-y divide-stone-100">
                {view.menus.slice(0, 5).map((m, i) => (
                  <li key={m.menuId}>
                    <Link to={`/forecast?menu=${m.menuId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-stone-900">{m.name}</p>
                        <p className="text-xs text-stone-500">{num(m.leftover)} dari {num(m.produced)} porsi tersisa</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', m.wastePct >= 20 ? 'bg-red-50 text-red-700' : m.wastePct >= 10 ? 'bg-amber-50 text-amber-800' : 'bg-brand-50 text-brand-800')}>
                        {pct(m.wastePct)}
                      </span>
                      <span className="w-24 text-right text-sm font-semibold text-stone-900">{rupiah(m.loss)}</span>
                      <ChevronRight className="size-4 shrink-0 text-stone-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </section>
      <SimulatedDataNote />
    </div>
  )
}
