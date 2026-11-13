import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react'
import { AiInsightCard } from '../../components/AiInsight'
import { Alert, Badge, Card, EmptyState, PageHeader, PageSkeleton, SimulatedDataNote, Stat, cn } from '../../components/ui'
import { useOutlet } from '../../contexts/AuthContext'
import { callAi } from '../../lib/api'
import { perMenu, summarize } from '../../lib/analytics'
import { fetchMenus, fetchRecords, useAsync } from '../../lib/data'
import { dailyFallback, forecastFallback, type ForecastRowLite } from '../../lib/fallback'
import { forecastMenu } from '../../lib/forecast'
import { addDays, dayName, formatDateLong, num, rupiah, todayISO, weekday } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import type { AiText, Confidence } from '../../lib/types'

const CONF_TONE: Record<Confidence, 'good' | 'warn' | 'danger'> = { tinggi: 'good', sedang: 'warn', rendah: 'danger' }

type InsightState = { content: AiText | null; source: 'ai' | 'fallback' | null; notice: string; loading: boolean }
const emptyInsight: InsightState = { content: null, source: null, notice: '', loading: false }

export default function ForecastPage() {
  const outlet = useOutlet()
  const location = useLocation()
  const today = todayISO()
  const [target, setTarget] = useState<string>(addDays(today, 1))
  const [autoTarget, setAutoTarget] = useState(true)
  const [explain, setExplain] = useState<InsightState>(emptyInsight)
  const [daily, setDaily] = useState<InsightState>(emptyInsight)

  // riwayat ~10 minggu terakhir (cukup untuk 6 data hari yang sama + rata-rata 30 hari)
  const { data, loading, error } = useAsync(async () => {
    const [menus, records] = await Promise.all([fetchMenus(outlet.id, true), fetchRecords(outlet.id, addDays(today, -70), today)])
    return { menus, records }
  }, [outlet.id, today])

  // Default: hari operasional berikutnya (lewati hari yang tidak pernah buka, misal Sabtu/Minggu)
  useEffect(() => {
    if (!data || !autoTarget) return
    const openDays = new Set(data.records.map((r) => weekday(r.record_date)))
    for (let k = 1; k <= 7; k++) {
      const d = addDays(today, k)
      if (openDays.has(weekday(d))) {
        setTarget(d)
        break
      }
    }
    setAutoTarget(false)
  }, [data, autoTarget, today])

  const rows = useMemo(() => {
    if (!data) return []
    return data.menus
      .filter((m) => m.is_active)
      .map((m) => {
        const history = data.records.filter((r) => r.menu_id === m.id).map((r) => ({ date: r.record_date, produced: r.produced, sold: r.sold }))
        return { menu: m, f: forecastMenu(history, target, m.hpp) }
      })
  }, [data, target])

  const latestDate = useMemo(() => {
    const dates = data?.records.map((r) => r.record_date).filter((d) => d <= today) ?? []
    return dates.length ? dates[dates.length - 1] : null
  }, [data, today])

  const totals = useMemo(
    () => ({ recommended: rows.reduce((a, r) => a + r.f.recommended, 0), saving: rows.reduce((a, r) => a + r.f.estimatedSaving, 0) }),
    [rows],
  )

  // muat cache penjelasan AI
  useEffect(() => {
    let alive = true
    setExplain(emptyInsight)
    supabase.from('ai_insights').select('content, source').eq('outlet_id', outlet.id).eq('insight_date', target).eq('kind', 'forecast').maybeSingle()
      .then(({ data: row }) => alive && row && setExplain({ ...emptyInsight, content: row.content as AiText, source: row.source as 'ai' | 'fallback' }))
    return () => { alive = false }
  }, [outlet.id, target])

  useEffect(() => {
    if (!latestDate) return
    let alive = true
    setDaily(emptyInsight)
    supabase.from('ai_insights').select('content, source').eq('outlet_id', outlet.id).eq('insight_date', latestDate).eq('kind', 'daily').maybeSingle()
      .then(({ data: row }) => alive && row && setDaily({ ...emptyInsight, content: row.content as AiText, source: row.source as 'ai' | 'fallback' }))
    return () => { alive = false }
  }, [outlet.id, latestDate])

  useEffect(() => {
    if (location.hash === '#kesimpulan' && data) document.getElementById('kesimpulan')?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash, data])

  async function store(kind: 'forecast' | 'daily', date: string, content: AiText, source: 'ai' | 'fallback') {
    await supabase.from('ai_insights').upsert({ outlet_id: outlet.id, insight_date: date, kind, content, source }, { onConflict: 'outlet_id,insight_date,kind' })
  }

  async function generateExplain() {
    const lite: ForecastRowLite[] = rows.map(({ menu, f }) => ({
      menu: menu.name,
      predicted_sold: f.predictedSold,
      recommended: f.recommended,
      confidence: f.confidence,
      change_pct: f.changePct,
      last_production: f.lastProduction,
      insufficient: f.insufficient,
    }))
    setExplain((s) => ({ ...s, loading: true, notice: '' }))
    const res = await callAi<AiText>('explain', { mode: 'forecast', outlet: outlet.business_name, target_date: target, day_name: dayName(target), rows: lite })
    const content = res.ok ? res.result : forecastFallback(lite, dayName(target))
    const source = res.ok ? 'ai' : 'fallback'
    setExplain({ content, source, notice: res.ok ? '' : res.message, loading: false })
    store('forecast', target, content, source)
  }

  async function generateDaily() {
    if (!data || !latestDate) return
    const dayRecs = data.records.filter((r) => r.record_date === latestDate)
    const s = summarize(dayRecs, data.menus)
    const last30 = data.records.filter((r) => r.record_date >= addDays(latestDate, -29) && r.record_date <= latestDate)
    const avg30 = summarize(last30, data.menus).wastePct
    const menus = perMenu(dayRecs, data.menus).map((m) => ({ menu: m.name, produced: m.produced, sold: m.sold, leftover: m.leftover, loss: m.loss }))
    const totalsPayload = { produced: s.produced, sold: s.sold, leftover: s.leftover, loss: s.loss, waste_pct: s.wastePct, avg_waste_pct_30d: last30.length ? avg30 : null }
    setDaily((st) => ({ ...st, loading: true, notice: '' }))
    const res = await callAi<AiText>('explain', { mode: 'daily', outlet: outlet.business_name, date: latestDate, day_name: dayName(latestDate), totals: totalsPayload, menus })
    const content = res.ok ? res.result : dailyFallback({ dayName: dayName(latestDate), totals: totalsPayload, menus })
    const source = res.ok ? 'ai' : 'fallback'
    setDaily({ content, source, notice: res.ok ? '' : res.message, loading: false })
    store('daily', latestDate, content, source)
  }

  if (loading && !data) return <PageSkeleton />
  if (error) return <Alert tone="danger">{error}</Alert>
  if (!data) return null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prediksi produksi"
        subtitle="Rekomendasi jumlah masak per menu berdasarkan pola penjualan di hari yang sama."
        action={
          <div className="flex items-center gap-2">
            <label htmlFor="target" className="text-sm font-semibold text-stone-700">Untuk</label>
            <input id="target" type="date" className="input w-auto" value={target} min={addDays(today, -30)} onChange={(e) => { if (e.target.value) { setAutoTarget(false); setTarget(e.target.value) } }} />
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="Belum ada menu aktif">Tambahkan menu dan isi catatan harian minimal 2 minggu agar prediksi akurat.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Hari target" value={dayName(target)} hint={formatDateLong(target)} />
            <Stat label="Total rekomendasi" value={`${num(totals.recommended)} porsi`} hint="sudah termasuk cadangan 5%" tone="good" />
            <Stat label="Estimasi hemat" value={rupiah(totals.saving)} hint="vs produksi terakhir di hari yang sama" tone="accent" />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-stone-50 text-left text-xs font-semibold text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Menu</th>
                    <th className="px-3 py-3 text-right">Prediksi terjual</th>
                    <th className="px-3 py-3 text-right">Rekomendasi produksi</th>
                    <th className="px-3 py-3 text-right">Produksi terakhir</th>
                    <th className="px-3 py-3">Vs rata-rata</th>
                    <th className="px-4 py-3">Keyakinan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map(({ menu, f }) => (
                    <tr key={menu.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-900">{menu.name}</p>
                        {f.insufficient && <p className="text-xs font-medium text-amber-700">Data belum cukup, pakai rata-rata keseluruhan</p>}
                      </td>
                      <td className="px-3 py-3 text-right">{num(f.predictedSold)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-base font-extrabold text-brand-800">{f.recommended}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-stone-600">
                        {f.lastProduction ?? '-'}
                        {f.lastProduction !== null && f.lastProduction > f.recommended && (
                          <span className="ml-1 text-xs font-semibold text-accent-600">(−{f.lastProduction - f.recommended})</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {f.changePct === null ? (
                          <span className="text-stone-400">-</span>
                        ) : (
                          <span className={cn('inline-flex items-center gap-1 font-semibold', f.changePct <= -5 ? 'text-accent-600' : f.changePct >= 5 ? 'text-brand-700' : 'text-stone-500')}>
                            {f.changePct <= -5 ? <ArrowDownRight className="size-4" /> : f.changePct >= 5 ? <ArrowUpRight className="size-4" /> : <Minus className="size-4" />}
                            {f.changePct > 0 ? '+' : ''}{num(f.changePct)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge tone={CONF_TONE[f.confidence]}>{f.confidence}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-start gap-2 border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Angka dihitung sistem (rata-rata tertimbang maks. 6 data terakhir di hari yang sama, data terbaru berbobot lebih besar, + cadangan 5%). AI hanya menjelaskan, tidak mengubah angka.
            </p>
          </Card>

          <AiInsightCard
            title={`Penjelasan kebutuhan ${dayName(target)}`}
            insight={explain.content}
            source={explain.source}
            notice={explain.notice}
            loading={explain.loading}
            onGenerate={generateExplain}
            generateLabel="Jelaskan rekomendasi"
          />
        </>
      )}

      <section id="kesimpulan" className="scroll-mt-20 space-y-3 pt-2">
        <h2 className="text-xl font-extrabold text-brand-900">Kesimpulan harian</h2>
        {latestDate ? (
          <>
            <p className="text-sm text-stone-600">Ringkasan AI untuk catatan terakhir: <b>{formatDateLong(latestDate)}</b></p>
            <AiInsightCard
              title={`Kesimpulan ${dayName(latestDate)}`}
              insight={daily.content}
              source={daily.source}
              notice={daily.notice}
              loading={daily.loading}
              onGenerate={generateDaily}
              generateLabel="Buat kesimpulan"
            />
          </>
        ) : (
          <EmptyState title="Belum ada catatan">Isi catatan harian dulu agar AI bisa membuat kesimpulan.</EmptyState>
        )}
      </section>
      <SimulatedDataNote />
    </div>
  )
}
