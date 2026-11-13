import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Coins, Download, PiggyBank, Percent, Sparkles, Trash2, TrendingUp } from 'lucide-react'
import { ProfitLossChart, WasteLineChart, WeekdayChart } from '../../components/charts'
import { Alert, Button, Card, EmptyState, PageHeader, PageSkeleton, Segmented, SimulatedDataNote, Stat, cn } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { byWeekday, dailySeries, perMenu, summarize, toCsv } from '../../lib/analytics'
import { downloadText, fetchMenus, fetchRecords, useAsync } from '../../lib/data'
import { addDays, formatDateLong, num, pct, rupiah, todayISO } from '../../lib/format'

export default function Dashboard() {
  const outlet = useOutlet()
  const [range, setRange] = useState<'7' | '30'>('30')
  const today = todayISO()
  const from = addDays(today, -(Number(range) - 1))

  const { data, loading, error, reload } = useAsync(async () => {
    const [menus, records] = await Promise.all([fetchMenus(outlet.id, true), fetchRecords(outlet.id, addDays(today, -29), today)])
    return { menus, records }
  }, [outlet.id, today])

  const view = useMemo(() => {
    if (!data) return null
    const records = data.records.filter((r) => r.record_date >= from)
    const latestDate = data.records.at(-1)?.record_date ?? null
    const latest = latestDate ? data.records.filter((r) => r.record_date === latestDate) : []
    return {
      records,
      summary: summarize(records, data.menus),
      menus: perMenu(records, data.menus),
      series: dailySeries(records, data.menus),
      weekdays: byWeekday(records),
      latestDate,
      latestSummary: summarize(latest, data.menus),
      latestMenus: perMenu(latest, data.menus),
    }
  }, [data, from])

  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger" title="Gagal memuat dashboard">{error} <button className="underline" onClick={reload}>Coba lagi</button></Alert>
  if (!data || !view) return null

  if (data.records.length === 0) {
    return (
      <>
        <PageHeader title={`Halo, ${outlet.business_name}`} subtitle="Belum ada catatan dalam 30 hari terakhir." />
        <EmptyState
          icon={<TrendingUp className="size-6" />}
          title="Mulai dari menu & catatan harian"
          action={<Link to="/input" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white">Isi catatan pertama <ArrowRight className="size-4" /></Link>}
        >
          Tambahkan menu beserta harga jual dan HPP, lalu catat produksi, terjual, dan sisa setiap hari. Dashboard akan terisi otomatis.
        </EmptyState>
      </>
    )
  }

  const s = view.summary
  const l = view.latestSummary

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`${outlet.business_name} · analisis waste & laba`}
        action={
          <>
            <Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7 hari' }, { value: '30', label: '30 hari' }]} />
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="size-4" />}
              onClick={() => downloadText(`foodprint-${outlet.business_name.replace(/\W+/g, '-')}-${from}-${today}.csv`, toCsv(view.records, data.menus))}
            >
              CSV
            </Button>
          </>
        }
      />

      {/* Laporan hari terakhir */}
      {view.latestDate && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-brand-50/60 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-brand-700">{view.latestDate === today ? 'Laporan hari ini' : 'Laporan terakhir'}</p>
              <p className="font-bold text-stone-900">{formatDateLong(view.latestDate)}</p>
            </div>
            <Link to="/forecast#kesimpulan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
              <Sparkles className="size-4" /> Kesimpulan AI
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-stone-100 sm:grid-cols-4 sm:divide-x">
            {[
              ['Diproduksi', `${num(l.produced)} porsi`],
              ['Terjual', `${num(l.sold)} porsi`],
              ['Sisa', `${num(l.leftover)} porsi (${pct(l.wastePct)})`],
              ['Kerugian waste', rupiah(l.loss)],
            ].map(([k, v], i) => (
              <div key={k} className="px-4 py-3">
                <p className="text-xs text-stone-500">{k}</p>
                <p className={cn('text-lg font-extrabold', i === 3 ? 'text-accent-600' : 'text-stone-900')}>{v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Porsi terbuang" value={num(s.leftover)} hint={`dari ${num(s.produced)} porsi diproduksi`} tone="accent" icon={<Trash2 className="size-4" />} />
        <Stat label="Kerugian waste" value={rupiah(s.loss)} hint="sisa × HPP" tone="danger" icon={<Coins className="size-4" />} />
        <Stat label="Persentase waste" value={pct(s.wastePct)} hint={`${s.days} hari tercatat`} icon={<Percent className="size-4" />} />
        <Stat label="Potensi hemat" value={rupiah(s.potentialSaving)} hint="jika produksi ikut rekomendasi" tone="good" icon={<PiggyBank className="size-4" />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Omzet penjualan" value={rupiah(s.revenue)} hint="terjual × harga jual" />
        <Stat label="Laba penjualan" value={rupiah(s.margin)} hint="terjual × (harga − HPP)" />
        <Stat
          label="Laba bersih setelah waste"
          value={<span className={s.net < 0 ? 'text-red-600' : 'text-brand-700'}>{rupiah(s.net)}</span>}
          hint="laba penjualan − kerugian waste"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-stone-900">Untung & rugi per menu</h2>
          <p className="mb-3 text-sm text-stone-500">Semua menu dalam {range} hari terakhir</p>
          <ProfitLossChart data={view.menus} />
        </Card>
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <h2 className="font-bold text-stone-900">Porsi terbuang per hari</h2>
            <p className="mb-3 text-sm text-stone-500">Total sisa semua menu</p>
            <WasteLineChart data={view.series} />
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="font-bold text-stone-900">Waste per hari dalam seminggu</h2>
            <p className="mb-3 text-sm text-stone-500">Persentase sisa dari produksi</p>
            <WeekdayChart data={view.weekdays} />
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 sm:px-5">
          <h2 className="font-bold text-stone-900">Menu paling boros</h2>
          <p className="text-sm text-stone-500">Diurutkan dari kerugian waste terbesar</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs font-semibold text-stone-500">
              <tr>
                <th className="px-4 py-2.5 sm:px-5">Menu</th>
                <th className="px-3 py-2.5 text-right">Diproduksi</th>
                <th className="px-3 py-2.5 text-right">Terjual</th>
                <th className="px-3 py-2.5 text-right">Sisa</th>
                <th className="px-3 py-2.5 text-right">Waste</th>
                <th className="px-3 py-2.5 text-right">Rugi waste</th>
                <th className="px-4 py-2.5 text-right sm:px-5">Laba bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {view.menus.map((m) => (
                <tr key={m.menuId}>
                  <td className="px-4 py-2.5 font-semibold text-stone-800 sm:px-5">{m.name}</td>
                  <td className="px-3 py-2.5 text-right">{num(m.produced)}</td>
                  <td className="px-3 py-2.5 text-right">{num(m.sold)}</td>
                  <td className="px-3 py-2.5 text-right">{num(m.leftover)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-semibold', m.wastePct >= 20 ? 'text-red-600' : m.wastePct >= 10 ? 'text-amber-700' : 'text-brand-700')}>
                    {pct(m.wastePct)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{rupiah(m.loss)}</td>
                  <td className={cn('px-4 py-2.5 text-right font-semibold sm:px-5', m.net < 0 ? 'text-red-600' : 'text-stone-900')}>{rupiah(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <SimulatedDataNote />
    </div>
  )
}
