// Grafik dashboard (Recharts). Palet divalidasi aman untuk buta warna:
// untung #2f6420 vs rugi #fb8a35 (CVD ΔE 21). Identitas tidak hanya warna: ada legenda + tabel.
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DayPoint, MenuStat, WeekdayPoint } from '../lib/analytics'
import type { DayTotal, Metric } from '../lib/diet'
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

export function WasteLineChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
                ]}
              />
            )
          }}
        />
        <Line type="monotone" dataKey="leftover" stroke={CHART.waste} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
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

export function DietMetricChart({ days, metric, unit, label, target }: { days: DayTotal[]; metric: Metric; unit: string; label: string; target: number }) {
  const rows = days.map((d) => ({ date: d.date, value: d.items > 0 ? d[metric] : null, items: d.items }))
  const max = Math.max(target * 1.2, ...rows.map((r) => r.value ?? 0))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: 'numeric' })} {...axisProps} interval={0} fontSize={11} />
        <YAxis {...axisProps} width={48} domain={[0, Math.ceil(max)]} tickFormatter={(v) => num(v)} />
        <ReferenceLine y={target} stroke="#57534e" strokeDasharray="5 4" label={{ value: `Target ${num(target)}`, position: 'insideTopRight', fill: '#57534e', fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { date: string; value: number | null; items: number }
            return (
              <TooltipBox
                title={formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}
                rows={d.value === null ? [{ label: label, value: 'belum dicatat' }] : [{ label, value: `${num(d.value)} ${unit}`, color: CHART.profit }, { label: 'Makanan dicatat', value: String(d.items) }]}
              />
            )
          }}
        />
        <Bar dataKey="value" fill={CHART.profit} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
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
