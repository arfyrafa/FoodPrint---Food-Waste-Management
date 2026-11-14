// Grafik dashboard (Recharts). Palet divalidasi aman untuk buta warna:
// untung #2f6420 vs rugi #fb8a35 (CVD ΔE 21). Identitas tidak hanya warna: ada legenda + tabel.
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DayPoint, MenuStat, WeekdayPoint } from '../lib/analytics'
import { onTarget, type DayTotal, type Metric } from '../lib/diet'
import { DAY_SHORT, formatDate, num, rupiah, rupiahShort } from '../lib/format'

export const CHART = {
  profit: '#2f6420',
  loss: '#fb8a35',
  waste: '#f06c10',
  grid: '#ece9e1',
  axis: '#78716c',
}

const axisProps = { stroke: CHART.axis, fontSize: 12, tickLine: false, axisLine: false } as const

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-stone-800">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-stone-600">
          {r.color && <span className="inline-block size-2.5 rounded-sm" style={{ background: r.color }} />}
          {r.label}: <span className="font-semibold text-stone-900">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

export function WasteLineChart({ data, onDayClick }: { data: DayPoint[]; onDayClick?: (date: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
        onClick={(state) => {
          const label = (state as { activeLabel?: string | number } | null)?.activeLabel
          if (onDayClick && typeof label === 'string') onDayClick(label)
        }}
        style={onDayClick ? { cursor: 'pointer' } : undefined}
      >
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} allowDecimals={false} width={44} />
        <Tooltip
          cursor={{ stroke: '#a8a29e', strokeDasharray: '4 4' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as DayPoint
            return (
              <TooltipBox
                title={formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}
                rows={[
                  { label: 'Porsi terbuang', value: `${num(d.leftover)} porsi`, color: CHART.waste },
                  { label: 'Waste', value: `${num(d.wastePct)}%` },
                  { label: 'Kerugian', value: rupiah(d.loss) },
                  ...(onDayClick ? [{ label: 'Klik', value: 'buka catatan tanggal ini' }] : []),
                ]}
              />
            )
          }}
        />
        <Line type="monotone" dataKey="leftover" stroke={CHART.waste} strokeWidth={2} dot={{ r: 3, fill: CHART.waste, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ProfitLossChart({ data }: { data: MenuStat[] }) {
  const rows = [...data].sort((a, b) => b.margin - a.margin)
  const height = Math.max(220, rows.length * 52 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => rupiahShort(v)} {...axisProps} />
        <YAxis type="category" dataKey="name" width={112} {...axisProps} tick={{ fill: '#44403c', fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as MenuStat
            return (
              <TooltipBox
                title={d.name}
                rows={[
                  { label: 'Laba penjualan', value: rupiah(d.margin), color: CHART.profit },
                  { label: 'Rugi waste', value: rupiah(d.loss), color: CHART.loss },
                  { label: 'Laba bersih', value: rupiah(d.net) },
                ]}
              />
            )
          }}
        />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: '#44403c' }}>{value}</span>} />
        <Bar dataKey="margin" name="Laba penjualan" fill={CHART.profit} radius={[0, 4, 4, 0]} maxBarSize={16} />
        <Bar dataKey="loss" name="Rugi waste" fill={CHART.loss} radius={[0, 4, 4, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: DAY_SHORT[d.dow] }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} width={48} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as WeekdayPoint
            return (
              <TooltipBox
                title={`Rata-rata hari ${['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.dow]}`}
                rows={[
                  { label: 'Waste', value: `${num(d.wastePct)}%`, color: CHART.waste },
                  { label: 'Sisa per hari', value: `${num(d.avgLeftover)} porsi` },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="wastePct" fill={CHART.waste} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------------- Grafik progres diet customer ----------------

/**
 * Grafik progres harian metrik fokus customer.
 * Batang hijau = sesuai target, oranye = belum sesuai (lewat batas / kurang), abu-abu = belum dicatat.
 * Warna selalu disertai legenda teks + label di tooltip (tidak mengandalkan warna saja).
 */
export function DietMetricChart({
  days, metric, unit, label, target, better,
}: { days: DayTotal[]; metric: Metric; unit: string; label: string; target: number; better: 'lower' | 'higher' | 'near' }) {
  const offLabel = better === 'lower' ? 'Lewat batas' : better === 'higher' ? 'Di bawah target' : 'Jauh dari target'
  const rows = days.map((d) => {
    const logged = d.items > 0
    const value = d[metric]
    const ok = logged && onTarget(value, target, better)
    return { date: d.date, value: logged ? value : target * 0.03, logged, real: value, ok, items: d.items }
  })
  const max = Math.max(target * 1.25, ...rows.map((r) => (r.logged ? r.real : 0)))
  const colorOf = (r: (typeof rows)[number]) => (!r.logged ? '#d6d3d1' : r.ok ? CHART.profit : CHART.loss)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-700">
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm" style={{ background: CHART.profit }} /> Sesuai target</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm" style={{ background: CHART.loss }} /> {offLabel}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-stone-300" /> Belum dicatat</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-stone-600" /> Target {num(target)} {unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="date"
            {...axisProps}
            interval={0}
            height={36}
            tick={(props) => {
              const { x, y, payload } = props as unknown as { x: number; y: number; payload: { value: string } }
              const d = new Date(`${payload.value}T00:00:00Z`)
              const isMonday = d.getUTCDay() === 1
              return (
                <g transform={`translate(${x},${y})`}>
                  <text y={12} textAnchor="middle" fill="#44403c" fontSize={11} fontWeight={600}>{d.getUTCDate()}</text>
                  {isMonday && <text y={26} textAnchor="middle" fill="#78716c" fontSize={10}>Sen</text>}
                </g>
              )
            }}
          />
          <YAxis {...axisProps} width={44} domain={[0, Math.ceil(max)]} tickFormatter={(v) => num(v)} />
          <ReferenceLine y={target} stroke="#57534e" strokeDasharray="5 4" strokeWidth={1.5} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof rows)[number]
              return (
                <TooltipBox
                  title={formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}
                  rows={
                    d.logged
                      ? [
                          { label, value: `${num(d.real)} ${unit}`, color: colorOf(d) },
                          { label: 'Status', value: d.ok ? 'Sesuai target' : offLabel },
                          { label: 'Makanan dicatat', value: String(d.items) },
                        ]
                      : [{ label, value: 'Belum ada makanan dicatat' }]
                  }
                />
              )
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {rows.map((r) => <Cell key={r.date} fill={colorOf(r)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WeightChart({ data, target }: { data: { log_date: string; weight_kg: number }[]; target: number | null }) {
  const rows = data.map((d) => ({ date: d.log_date, weight: Number(d.weight_kg) }))
  const values = rows.map((r) => r.weight).concat(target ? [target] : [])
  const lo = Math.floor(Math.min(...values) - 1)
  const hi = Math.ceil(Math.max(...values) + 1)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} {...axisProps} minTickGap={20} />
        <YAxis {...axisProps} width={40} domain={[lo, hi]} tickFormatter={(v) => num(v)} />
        {target && <ReferenceLine y={target} stroke="#57534e" strokeDasharray="5 4" label={{ value: `Target ${num(target)} kg`, position: 'insideBottomRight', fill: '#57534e', fontSize: 11 }} />}
        <Tooltip
          cursor={{ stroke: '#a8a29e', strokeDasharray: '4 4' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { date: string; weight: number }
            return <TooltipBox title={formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })} rows={[{ label: 'Berat', value: `${num(d.weight)} kg`, color: CHART.profit }]} />
          }}
        />
        <Line type="monotone" dataKey="weight" stroke={CHART.profit} strokeWidth={2} dot={{ r: 4, fill: CHART.profit, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
